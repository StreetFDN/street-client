import { prisma } from '../db';
import { fetchRepoActivity } from './github/fetcher';
import { generateSummary } from './summarizer';

/**
 * Syncs a single repo for a specific time window
 */
export async function syncRepo(
  repoId: string,
  windowStart: Date,
  windowEnd: Date,
  runType: 'daily' | 'backfill'
): Promise<void> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: { id: repoId },
    include: { installation: true },
  });

  if (!repo || !repo.isEnabled) {
    throw new Error(`Repo ${repoId} not found or not enabled`);
  }

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
    // Fetch activity
    const activity = await fetchRepoActivity(
      repo.installation.installationId,
      repo.owner,
      repo.name,
      windowStart,
      windowEnd
    );

    // Store activity events (optional but useful for debugging)
    const allEvents = [...activity.mergedPRs, ...activity.releases, ...activity.commits];
    for (const event of allEvents) {
      await prisma.repoActivityEvent.create({
        data: {
          repoId,
          occurredAt: event.occurredAt,
          type: event.type,
          title: event.title,
          url: event.url,
          author: event.author || undefined,
          additions: event.additions,
          deletions: event.deletions,
          metadata: event.metadata || undefined,
        },
      });
    }

    // Generate summary
    const summaryText = await generateSummary(activity);
    const noChanges = activity.counts.mergedPRs === 0 && activity.counts.releases === 0 && activity.counts.commits === 0;

    // Get date for the summary (use window start's date)
    const date = new Date(windowStart);
    date.setUTCHours(0, 0, 0, 0);

    // Store or update summary (idempotent by repo_id + date)
    await prisma.repoDailySummary.upsert({
      where: {
        repoId_date: {
          repoId,
          date,
        },
      },
      create: {
        repoId,
        date,
        windowStart,
        windowEnd,
        summaryText,
        stats: activity.counts,
        noChanges,
      },
      update: {
        windowStart,
        windowEnd,
        summaryText,
        stats: activity.counts,
        noChanges,
        updatedAt: new Date(),
      },
    });

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
 * Syncs all enabled repos for the last 24 hours (daily sync)
 */
export async function syncAllReposDaily(): Promise<void> {
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  const enabledRepos = await prisma.gitHubRepo.findMany({
    where: { isEnabled: true },
  });

  console.log(`Starting daily sync for ${enabledRepos.length} repos`);

  for (const repo of enabledRepos) {
    try {
      await syncRepo(repo.id, windowStart, windowEnd, 'daily');
      console.log(`✓ Synced ${repo.owner}/${repo.name}`);
    } catch (error) {
      console.error(`✗ Failed to sync ${repo.owner}/${repo.name}:`, error);
    }
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
  for (const dayStart of days) {
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCHours(23, 59, 59, 999);

    try {
      await syncRepo(repoId, dayStart, dayEnd, 'backfill');
      console.log(`✓ Backfilled ${dayStart.toISOString().split('T')[0]} for ${repo.owner}/${repo.name}`);
    } catch (error) {
      console.error(`✗ Failed to backfill ${dayStart.toISOString().split('T')[0]} for ${repo.owner}/${repo.name}:`, error);
    }
  }
}
