import {
  CreatedInstallationEvent,
  DeletedInstallationEvent,
  InstallationEvent,
  InstallationEventSchema,
  SupportedInstallationAction,
} from 'utils/validation/github';
import { prisma } from 'db';
import { backfillRepo } from 'services/sync';
import { createAppAuth } from '@octokit/auth-app';
import { config } from 'config';
import { Octokit } from '@octokit/rest';
import { Client, UserRole } from '@prisma/client';
import { Maybe } from 'types/utils';

const actionHandlers: Record<
  SupportedInstallationAction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (payload: any) => Promise<void>
> = {
  created: handleCreateInstallationAction,
  deleted: handleDeletedInstallationAction,
};

export default async function handleInstallationEvent(
  payload_data: unknown,
): Promise<void> {
  const payload = InstallationEventSchema.parse(
    payload_data,
  ) as InstallationEvent;

  await actionHandlers[payload.action](payload);
}

async function handleCreateInstallationAction(
  payload: CreatedInstallationEvent,
): Promise<void> {
  const installation = payload.installation;
  const account = payload.installation.account;

  // Try to find user by GitHub login
  // TODO: Figure out how to sanitize this.
  //       It is required to make this safe, currently, there is no guarantee, that the account exists, or
  //       that it can be created.
  const githubAccount = (await prisma.githubAccount.findUnique({
    where: { login: account.login },
    include: {
      user: {
        include: {
          clients: {
            include: {
              client: true,
            },
          },
        },
      },
    },
  }))!;

  let client: Maybe<Client> = null;
  // This is orphaned installation. Someone triggered installation outside the expected context, resulting
  // it being installed without whitelisted client.
  if (githubAccount.user != null) {
    const potentialClients = githubAccount.user.clients.filter(
      (access) =>
        access.role == UserRole.ADMIN &&
        access.client.githubInstallationId == null,
    );

    if (potentialClients.length == 1) {
      client = potentialClients[0].client;
    }
  }

  const clientSubQuery = {
    client: {
      connect: {
        id: client?.id,
      },
    },
  };

  // Create or update installation
  const githubInstallation = await prisma.gitHubInstallation.create({
    data: {
      githubId: installation.id,
      creatorId: githubAccount.id,
      ...(client != null ? clientSubQuery : {}),
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
            githubId: repo.id,
          },
          create: {
            installationId: githubInstallation.id,
            owner: repo.owner.login,
            name: repo.name,
            githubId: repo.id,
            isPrivate: repo.private,
            isEnabled: true,
          },
          update: {
            isPrivate: repo.private,
          },
        });

        console.log(`Repo synced: ${repo.owner.login}/${repo.name}`);
      } catch (error) {
        console.error(
          `Error processing repo ${repo.owner.login}/${repo.name}:`,
          error,
        );
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
      backfillRepo(repo.id).catch((error) => {
        console.error(`Error backfilling repo ${repo.id}:`, error);
      });
    }
  } catch (error) {
    console.error(
      `Error fetching repos for installation ${installation.id}:`,
      error,
    );
  }
}

async function handleDeletedInstallationAction(
  payload: DeletedInstallationEvent,
): Promise<void> {
  const installationId = payload.installation.id;

  await prisma.gitHubInstallation.updateMany({
    where: {
      githubId: installationId,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  console.log(`Installation revoked: ${installationId}.`);
}
