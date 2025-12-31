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
    } else if (event === 'installation_repositories' && payload_data.action === 'added') {
      await handleRepositoriesAdded(payload_data);
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

  // For now, we'll create a default client or use installation ID as client identifier
  // In a real app, you'd have a way to associate installations with clients
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
      },
    });
  }

  // Create or update installation
  await prisma.gitHubInstallation.upsert({
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