import { prisma } from 'db';
import { Prisma, RepoActivityEvent } from '@prisma/client';
import { getInstallationOctokit } from './github/auth';
import { uniqueBy } from 'utils/array';

/**
 * Syncs a single repo for a specific time window
 */
export async function syncRepo(
  repoId: string,
  runType: 'daily' | 'backfill',
): Promise<void> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
    include: { installation: true },
  });

  if (!repo || !repo.isEnabled) {
    throw new Error(`Repo ${repoId} not found or not enabled`);
  }

  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getDate() - 7);
  // Create sync run record
  const syncRun = await prisma.repoSyncRun.create({
    data: {
      repoId,
      runType,
      windowStart,
      windowEnd,
      status: 'running',
      startedAt: new Date(),
    },
  });

  try {
    console.log(
      `Fetching activity for ${repo.owner}/${repo.name} (${windowStart.toISOString()} to ${windowEnd.toISOString()})`,
    );

    const activityEvents = await prisma.repoActivityEvent.findMany({
      where: {
        repoId,
        occurredAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    if (activityEvents.length === 0 && runType === 'backfill') {
      await backfillRepoActivities(repo);
    }

    // Get date for the summary
    // For daily sync, use today's date. For backfill, use window start's date
    let date: Date;
    if (runType === 'daily') {
      // For daily sync, use today's UTC date (the day we're syncing)
      date = new Date();
      date.setUTCHours(0, 0, 0, 0);
    } else {
      // For backfill, use window start's date
      date = new Date(windowStart);
      date.setUTCHours(0, 0, 0, 0);
    }

    // Mark sync run as successful
    await prisma.repoSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'success',
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error syncing repo ${repoId}:`, error);
    await prisma.repoSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : String(error),
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

/**
 * Backfills summaries for a repo for the last 7 days
 */
export async function backfillRepo(repoId: string): Promise<void> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
  });

  if (!repo) {
    throw new Error(`Repo ${repoId} not found`);
  }

  console.log(`Starting backfill for repo ${repoId}`);

  // Generate 7 calendar days, going backwards from today
  const now = new Date();
  const days: Date[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0);
    days.push(date);
  }

  // For each day, create a 24h window (00:00 to 23:59 UTC)
  try {
    await syncRepo(repoId, 'backfill');
    console.log(`✓ Backfilled for ${repo.owner}/${repo.name}`);
  } catch (error) {
    console.error(
      `✗ Failed to backfill for ${repo.owner}/${repo.name}:`,
      error,
    );
  }
}

export async function backfillRepoActivities(
  repo: Prisma.GitHubRepoGetPayload<{ include: { installation: true } }>,
): Promise<RepoActivityEvent[]> {
  const octokit = await getInstallationOctokit(repo.installation.githubId);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sinceIso = since.toISOString();

  const data = [];

  // 1) Commits since (defaults to repo's default branch unless you pass sha)
  const commits = await octokit.paginate('GET /repos/{owner}/{repo}/commits', {
    owner: repo.owner,
    repo: repo.name,
    since: sinceIso,
    per_page: 100,
  });

  data.push(
    ...commits.map((c) => ({
      githubId: c.sha,
      repoId: repo.id,
      occurredAt:
        c.commit?.author?.date ?? c.commit?.committer?.date ?? new Date(),
      type: 'commit',
      title: c.commit.message,
      url: c.commit.url,
      author: c.author?.login ?? c.commit?.committer?.date ?? 'unknown',
    })),
  );

  // 2) Merged PRs in last 7 days
  const closedPRs = await octokit.paginate('GET /repos/{owner}/{repo}/pulls', {
    owner: repo.owner,
    repo: repo.name,
    state: 'closed',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  });

  data.push(
    ...closedPRs
      .filter((pr) => new Date(pr.merged_at ?? sinceIso) >= since)
      .map((pr) => ({
        githubId: pr.id.toString(),
        repoId: repo.id,
        occurredAt: pr.merged_at ?? new Date(),
        type: 'pull_request',
        title: pr.title,
        url: pr.url,
        author: pr.user?.login ?? 'unknown',
      })),
  );

  // 3) Releases published in last 7 days
  const releases = await octokit.paginate(
    'GET /repos/{owner}/{repo}/releases',
    {
      owner: repo.owner,
      repo: repo.name,
      per_page: 100,
    },
  );

  data.push(
    ...releases
      .filter((r) => new Date(r.published_at ?? r.created_at ?? since) >= since)
      .map((r) => ({
        githubId: r.id.toString(),
        repoId: repo.id,
        occurredAt: r.published_at ?? r.created_at ?? new Date(),
        type: 'release',
        title: r.name ?? r.tag_name,
        url: r.url,
        author: r.author.login,
      })),
  );

  const uniqueData = uniqueBy(data, (item) => [
    item.githubId,
    item.type,
    item.repoId,
  ]);

  return prisma.repoActivityEvent.createManyAndReturn({
    data: uniqueData,
  });
}
