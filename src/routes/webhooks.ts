import { Router, Request, Response } from 'express';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { config } from '../config';
import { prisma } from '../db';
import { backfillRepo } from '../services/sync';
import { verifyWebhookSignature } from '../utils/webhook';

const router = Router();

/**
 * Handles GitHub App installation events
 * Note: This route expects raw body (handled by middleware in app.ts)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = req.body as Buffer;

    if (!verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload_data = JSON.parse(payload.toString());

    const event = req.headers['x-github-event'] as string;

    console.log(`Received GitHub webhook: ${event}`);

    if (event === 'installation' && payload_data.action === 'created') {
      await handleInstallationCreated(payload_data);
    } else if (event === 'installation' && payload_data.action === 'deleted') {
      await handleInstallationDeleted(payload_data);
    } else if (event === 'installation_repositories') {
      if (payload_data.action === 'added') {
        await handleRepositoriesAdded(payload_data);
      } else if (payload_data.action === 'removed') {
        // Handle repository removal if needed
        console.log(`Repositories removed from installation ${payload_data.installation.id}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleInstallationCreated(payload: any): Promise<void> {
  const installation = payload.installation;
  const account = payload.installation.account;

  // Try to find user by GitHub login first
  let user = await prisma.user.findUnique({
    where: { githubLogin: account.login },
  });

  // If not found, try to find by email (from GitHub account)
  // This helps link Supabase users who haven't logged in via GitHub OAuth yet
  if (!user && account.email) {
    user = await prisma.user.findFirst({
      where: { email: account.email },
    });
  }

  // Find or create client
  let client = await prisma.client.findFirst({
    where: {
      installations: {
        some: {
          accountLogin: account.login,
        },
      },
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        name: `${account.login} (GitHub)`,
        userId: user?.id || null, // Link to user if found by login or email
      },
    });
  } else if (user && !client.userId) {
    // Link existing client to user if user found (by login or email)
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { userId: user.id },
    });
    client = updatedClient;
  }

  // Create or update installation
  const githubInstallation = await prisma.gitHubInstallation.upsert({
    where: {
      installationId: installation.id,
    },
    create: {
      clientId: client.id,
      installationId: installation.id,
      accountLogin: account.login,
    },
    update: {
      accountLogin: account.login,
      revokedAt: null,
    },
  });

  console.log(`Installation created: ${installation.id} for ${account.login}`);

  // Fetch all repositories for this installation (handles "All repositories" case)
  try {
    const auth = createAppAuth({
      appId: config.github.appId,
      privateKey: config.github.privateKey,
    });

    const { token } = await auth({
      type: 'installation',
      installationId: installation.id,
    });

    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    // Process each repository
    for (const repo of response.data.repositories) {
      try {
        await prisma.gitHubRepo.upsert({
          where: {
            repoId: repo.id,
          },
          create: {
            clientId: client.id,
            installationId: githubInstallation.id,
            owner: repo.owner.login,
            name: repo.name,
            repoId: repo.id,
            isPrivate: repo.private,
            isEnabled: true,
          },
          update: {
            isPrivate: repo.private,
          },
        });

        console.log(`Repo synced: ${repo.owner.login}/${repo.name}`);
      } catch (error) {
        console.error(`Error processing repo ${repo.owner.login}/${repo.name}:`, error);
      }
    }

    // Trigger backfill for newly added repos (only repos that don't have summaries yet)
    const newRepos = await prisma.gitHubRepo.findMany({
      where: {
        installationId: githubInstallation.id,
        dailySummaries: {
          none: {},
        },
      },
    });

    for (const repo of newRepos) {
      backfillRepo(repo.id).catch(error => {
        console.error(`Error backfilling repo ${repo.id}:`, error);
      });
    }
  } catch (error) {
    console.error(`Error fetching repos for installation ${installation.id}:`, error);
  }
}

async function handleInstallationDeleted(payload: any): Promise<void> {
  const installationId = payload.installation.id;

  await prisma.gitHubInstallation.updateMany({
    where: {
      installationId,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  console.log(`Installation revoked: ${installationId}`);
}

async function handleRepositoriesAdded(payload: any): Promise<void> {
  const installation = payload.installation;
  const repositories_added = payload.repositories_added || [];

  const githubInstallation = await prisma.gitHubInstallation.findUnique({
    where: {
      installationId: installation.id,
    },
  });

  if (!githubInstallation) {
    console.warn(`Installation ${installation.id} not found in database`);
    return;
  }

  // Fetch full repo details from GitHub
  const auth = createAppAuth({
    appId: config.github.appId,
    privateKey: config.github.privateKey,
  });

  const { token } = await auth({
    type: 'installation',
    installationId: installation.id,
  });

  const octokit = new Octokit({ auth: token });

  for (const repo of repositories_added) {
    try {
      const fullRepo = await octokit.rest.repos.get({
        owner: repo.owner.login,
        repo: repo.name,
      });

      const repoData = fullRepo.data;

      // Create or update repo
      const githubRepo = await prisma.gitHubRepo.upsert({
        where: {
          repoId: repoData.id,
        },
        create: {
          clientId: githubInstallation.clientId,
          installationId: githubInstallation.id,
          owner: repoData.owner.login,
          name: repoData.name,
          repoId: repoData.id,
          isPrivate: repoData.private,
          isEnabled: true,
        },
        update: {
          isPrivate: repoData.private,
        },
      });

      console.log(`Repo added: ${repoData.owner.login}/${repoData.name}`);

      // Trigger backfill for newly added repo
      await backfillRepo(githubRepo.id);
    } catch (error) {
      console.error(`Error processing repo ${repo.owner.login}/${repo.name}:`, error);
    }
  }
}

export default router;