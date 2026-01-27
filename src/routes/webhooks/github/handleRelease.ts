import {
  ReleaseEvent,
  ReleaseEventSchema,
  SupportedReleaseAction,
} from 'utils/validation/github';
import { prisma } from 'db';
import { GitHubRepo } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionHandler = (_: any, repo: GitHubRepo) => Promise<void>;
const actionHandlers: Record<SupportedReleaseAction, ActionHandler> = {
  released: createRelease,
  deleted: deleteRelease,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handleRelease(payload_data: any): Promise<void> {
  const payload = ReleaseEventSchema.parse(payload_data) as ReleaseEvent;
  const handlers = actionHandlers as Record<string, ActionHandler | undefined>;

  const repo = await prisma.gitHubRepo.findFirst({
    where: {
      repoId: payload.repository.id,
      isEnabled: true,
    },
  });

  if (repo == null) {
    console.warn(
      `Received release for non-existent/disabled repository ${payload.repository.id}`,
    );
    return;
  }

  const handler = handlers[payload.action];
  if (handler != null) {
    await handler(payload, repo);
  } else {
    console.info(
      `Got release action ${payload.action} without defined handler: ${payload.release.url}`,
    );
  }
}

async function deleteRelease(
  payload: ReleaseEvent,
  repo: GitHubRepo,
): Promise<void> {
  // NOTE: Deleting this mimics current implementation. As deleted releases are just not shown in the activity feed
  // at all. This can be changed if necessary, but IMO not worth rn.
  const deleted = await prisma.repoActivityEvent.deleteMany({
    where: {
      repoId: repo.id,
      type: 'release',
      githubId: payload.release.id.toString(),
    },
  });

  console.log(`Deleted ${deleted.count} releases due to the event.`);
}

async function createRelease(
  payload: ReleaseEvent,
  repo: GitHubRepo,
): Promise<void> {
  const release = payload.release;
  const author = release.author;

  await prisma.repoActivityEvent.create({
    data: {
      githubId: payload.release.id.toString(),
      repoId: repo.id,
      occurredAt:
        release.published_at ??
        release.updated_at ??
        release.created_at ??
        new Date(),
      type: 'release',
      title: release.name,
      url: release.url,
      author: author.login,
    },
  });
}
