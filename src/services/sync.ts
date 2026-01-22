import {prisma} from '../db';
import {ActivityEvent, fetchRepoActivity} from './github/fetcher';
import {generateSummary} from './summarizer';
import {RepoActivityEvent} from "@prisma/client";

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
    where: {id: repoId},
    include: {installation: true},
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
    console.log(`Fetching activity for ${repo.owner}/${repo.name} (${windowStart.toISOString()} to ${windowEnd.toISOString()})`);

    const activityEvents = await prisma.repoActivityEvent.findMany({
      where: {
        repoId,
        occurredAt: {
          gte: windowStart,
          lte: windowEnd,
        }
      }
    });

    const activity = activityEvents.reduce<Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>>((acc, event) => {
      if (event.type == 'pr_merged') {
        acc['pr_merged'].push(event);
      } else if (event.type == 'release') {
        acc['release'].push(event);
      } else if (event.type == 'commit') {
        acc['commit'].push(event);
      } else {
        console.warn(`Unhandled repo event: ${event.type}`);
      }

      return acc;
    }, {
      'pr_merged': [],
      'release': [],
      'commit': []
    });

    // Generate summary
    const summaryText = await generateSummary(activity);
    const noChanges = activity['pr_merged'].length === 0 && activity['release'].length === 0 && activity['commit'].length === 0;
    console.log(`Summary for ${repo.owner}/${repo.name}: ${noChanges ? 'NO CHANGES' : 'HAS CHANGES'} - "${summaryText.substring(0, 100)}..."`);

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
        stats: {
          prMerged: activity['pr_merged'].length,
          releases: activity['release'].length,
          commits: activity['commit'].length,
        },
        noChanges,
      },
      update: {
        windowStart,
        windowEnd,
        summaryText,
        stats: {
          prMerged: activity['pr_merged'].length,
          releases: activity['release'].length,
          commits: activity['commit'].length,
        },
        noChanges,
        updatedAt: new Date(),
      },
    });

    // Mark sync run as successful
    await prisma.repoSyncRun.update({
      where: {id: syncRun.id},
      data: {
        status: 'success',
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Error syncing repo ${repoId}:`, error);
    await prisma.repoSyncRun.update({
      where: {id: syncRun.id},
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
  // Use last 48 hours to ensure we capture all activity (some commits might be slightly delayed)
  const windowStart = new Date(windowEnd.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

  const enabledRepos = await prisma.gitHubRepo.findMany({
    where: {isEnabled: true},
  });

  console.log(`Starting daily sync for ${enabledRepos.length} repos (window: ${windowStart.toISOString()} to ${windowEnd.toISOString()})`);

  for (const repo of enabledRepos) {
    try {
      await syncRepo(repo.id, windowStart, windowEnd, 'daily');
      console.log(`✓ Synced ${repo.owner}/${repo.name}`);
    } catch (error) {
      console.error(`✗ Failed to sync ${repo.owner}/${repo.name}:`, error);
    }
  }

  console.log(`Daily sync completed for ${enabledRepos.length} repos`);
}

/**
 * Backfills summaries for a repo for the last 7 days
 */
export async function backfillRepo(repoId: string): Promise<void> {
  const repo = await prisma.gitHubRepo.findUnique({
    where: {id: repoId},
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
