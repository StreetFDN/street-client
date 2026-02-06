import {
  AddedInstallationRepositoriesEvent,
  InstallationRepositoriesEvent,
  InstallationRepositoriesEventSchema,
  RemovedInstallationRepositoriesEvent,
  SupportedInstallationRepositoriesAction,
} from 'utils/validation/github';
import { prisma } from 'db';
import { config } from 'config';
import { backfillRepo } from 'services/sync';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

const actionHandlers: Record<
  SupportedInstallationRepositoriesAction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (_: any) => Promise<void>
> = {
  added: handleAddedInstallationRepositoriesEvent,
  removed: handleRemovedInstallationRepositoriesEvent,
};

export default async function handleInstallationRepositoriesEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload_data: any,
): Promise<void> {
  const payload = InstallationRepositoriesEventSchema.parse(
    payload_data,
  ) as InstallationRepositoriesEvent;

  await actionHandlers[payload.action](payload);
}

async function handleAddedInstallationRepositoriesEvent(
  payload: AddedInstallationRepositoriesEvent,
): Promise<void> {
  const installation = payload.installation;
  const repositories_added = payload.repositories_added || [];

  const githubInstallation = await prisma.gitHubInstallation.findUnique({
    where: {
      githubId: installation.id,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        owner: (repo as any).owner.login,
        repo: repo.name,
      });

      const repoData = fullRepo.data;

      // Create or update repo
      const githubRepo = await prisma.gitHubRepo.upsert({
        where: {
          githubId: repoData.id,
        },
        create: {
          installationId: githubInstallation.id,
          owner: repoData.owner.login,
          name: repoData.name,
          githubId: repoData.id,
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
      console.error(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `Error processing repo ${(repo as any).owner.login}/${repo.name}:`,
        error,
      );
    }
  }
}

async function handleRemovedInstallationRepositoriesEvent(
  payload: RemovedInstallationRepositoriesEvent,
): Promise<void> {
  // Handle repository removal if needed
  console.log(
    `Repositories removed from installation ${payload.installation.id}`,
  );
}
