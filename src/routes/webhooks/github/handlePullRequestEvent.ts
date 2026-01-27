import { PullRequestEventSchema } from 'utils/validation/github';
import { prisma } from 'db';

export default async function handlePullRequestEvent(
  payload_data: any,
): Promise<void> {
  const payload = PullRequestEventSchema.parse(payload_data);
  const pullRequest = payload.pull_request;

  if (payload.action !== 'closed' || pullRequest.merged_at == null) {
    return;
  }

  const repo = await prisma.gitHubRepo.findFirst({
    where: {
      repoId: payload.repository.id,
      isEnabled: true,
    },
  });

  if (repo == null) {
    console.warn(
      `Received pull request for non-existent/disabled repository ${payload.repository.id}`,
    );
    return;
  }

  try {
    await prisma.repoActivityEvent.create({
      data: {
        githubId: pullRequest.id.toString(),
        repoId: repo.id,
        occurredAt: pullRequest.merged_at,
        type: 'pull_request',
        title: pullRequest.title,
        url: pullRequest.url,
        author: pullRequest.user.login,
      },
    });
  } catch (error) {
    console.error(`Failed to store pull request ${pullRequest.url}: `, error);
  }
}
