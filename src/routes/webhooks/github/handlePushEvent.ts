import {PushEvent, PushEventSchema} from "utils/validation/github";
import {prisma} from "db";

export default async function handlePushEvent(payload_data: any): Promise<void> {
  const payload = PushEventSchema.parse(payload_data) as PushEvent;

  const repo = await prisma.gitHubRepo.findFirst({
    where: {
      repoId: payload.repository.id,
      isEnabled: true,
    }
  });

  if (repo == null) {
    console.warn(`Received push event for non-existent/disable repository ${payload.repository.id}`);
    return;
  }

  for (const commit of payload.commits) {
    // Some commits might be duplicated and/or do not have any meaningful content.
    // These can be safely skipped, as they are currently filtered in the repository event endpoint anyway.
    const skip = !commit.distinct
      || isMergeMessage(commit.message)
      || isRevertMessage(commit.message);

    if (skip) {
      console.log(`Skipping commit ${commit.url} - Already stored, or not contentful.`)
      continue;
    }

    try {
      const existingCommit = await prisma.repoActivityEvent.findFirst({
        where: {
          repoId: repo.id,
          url: commit.url,
        }
      });

      if (existingCommit == null) {
        await prisma.repoActivityEvent.create({
          data: {
            repoId: repo.id,
            occurredAt: commit.timestamp,
            type: 'commit',
            title: commit.message,
            url: commit.url,
            author: commit.author.username,
            metadata: {'sha': commit.id},
          }
        });
      }
    } catch (error) {
      console.error(`Failed to store push event ${commit.url}: `, error)
    }
  }
}

function isMergeMessage(message: string): boolean {
  return message.startsWith("Merge pull request") ||
    message.startsWith("Merge branch") ||
    message.startsWith("Merge remote-tracking branch");
}

function isRevertMessage(message: string): boolean {
  return message.startsWith("Revert \"");
}
