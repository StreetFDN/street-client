import {
  CreatedInstallationEvent, DeletedInstallationEvent,
  InstallationEvent,
  InstallationEventSchema,
  SupportedInstallationAction
} from "utils/validation/github";
import {prisma} from "db";
import {backfillRepo} from "services/sync";
import {createAppAuth} from "@octokit/auth-app";
import {config} from "config";
import {Octokit} from "@octokit/rest";

const actionHandlers: Record<SupportedInstallationAction, (payload: any) => Promise<void>> = {
  'created': handleCreateInstallationAction,
  'deleted': handleDeletedInstallationAction,
};

export default async function handleInstallationEvent(payload_data: any): Promise<void> {
  const payload = InstallationEventSchema.parse(payload_data) as InstallationEvent;

  await actionHandlers[payload.action](payload);
}

async function handleCreateInstallationAction(payload: CreatedInstallationEvent): Promise<void> {
  const installation = payload.installation;
  const account = payload.installation.account;

  // Try to find user by GitHub login first
  let user = await prisma.user.findUnique({
    where: {githubLogin: account.login},
  });

  // If not found, try to find by email (from GitHub account)
  // This helps link Supabase users who haven't logged in via GitHub OAuth yet
  if (!user && account.email) {
    user = await prisma.user.findFirst({
      where: {email: account.email},
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
    client = await prisma.client.update({
      where: {id: client.id},
      data: {userId: user.id},
    });
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

    const {token} = await auth({
      type: 'installation',
      installationId: installation.id,
    });

    const octokit = new Octokit({auth: token});
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

async function handleDeletedInstallationAction(payload: DeletedInstallationEvent): Promise<void> {
  const installationId = payload.installation.id;

  await prisma.gitHubInstallation.updateMany({
    where: {
      installationId,
    },
    data: {
      revokedAt: new Date(),
    }
  });

  const revokedInstallations = (await prisma.gitHubInstallation.findMany({
    select: {
      id: true,
    },
    where: {
      installationId
    }
  })).map(({id}) => id);

// Disable all repositories associated with this installation.
// TODO (mlacko): Think about adding cleaner to delete stale disabled repos.
  const disabledRepos = await prisma.gitHubRepo.updateMany({
    where: {
      installationId: {
        in: revokedInstallations,
      }
    },
    data: {
      isEnabled: false,
    }
  });

  console.log(`Installation revoked: ${installationId}; ${disabledRepos.count} associated repos disabled.`);
}