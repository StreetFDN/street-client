import OpenAI from 'openai';
import { config } from '../config';
import { RepoActivityEvent } from '@prisma/client';
import { prisma } from '../db';

const openai = new OpenAI({
  apiKey: config.openai.apiKey as string | undefined,
});

/**
 * Generates a short summary of GitHub activity using LLM
 */
export async function generateSummary(
  activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): Promise<[string, boolean]> {
  if (config.openai.apiKey) {
    return generateSummaryWithLLM(activities);
  } else {
    return generateSummaryFallback(activities);
  }
}

async function generateSummaryWithLLM(
  activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): Promise<[string, boolean]> {
  const items: string[] = [];

  for (const pr of activities['pr_merged']) {
    items.push(
      `- Merged PR: "${pr.title}" by ${pr.author || 'unknown'} (${pr.url})`,
    );
  }

  for (const release of activities['release']) {
    items.push(
      `- Release: "${release.title}" by ${release.author || 'unknown'} (${release.url})`,
    );
  }

  for (const commit of activities['commit'].slice(0, 10)) {
    // Limit commits in prompt
    items.push(
      `- Commit: "${commit.title}" by ${commit.author || 'unknown'} (${commit.url})`,
    );
  }

  if (items.length === 0) {
    return ['No relevant GitHub changes in the last 24h.', true];
  }

  const prompt = `Summarize the following GitHub activity in a brief, factual paragraph. Be concise, technical, and slightly dry. No hype, no marketing language, no emojis. Focus on concrete changes and what was BUILT or ACCOMPLISHED, not just what was merged. Recognize scope: a "landing page" means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the work: "Built", "Implemented", "Added", "Created" - not just "Merged". INCLUDE all meaningful changes - don't filter out unless it's truly only assets/images/icons or formatting. Format as plain text, no markdown:

${items.join('\n')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are writing a founder-level technical update. Be concise, factual, and slightly dry. Assume the reader is technical and time-constrained. No hype, no marketing language, no emojis. Do not narrate emotions or intent. Prefer concrete changes over explanations. Describe what was BUILT or ACCOMPLISHED, not just what was merged. Recognize scope: a "landing page" means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the work: "Built", "Implemented", "Added", "Created" - not just "Merged". INCLUDE all meaningful changes including UI improvements, API changes, bug fixes, and features. Only exclude pure assets/images/icons or formatting-only changes. Goal is to show activity, not filter it out.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
    });

    return [
      completion.choices[0]?.message?.content?.trim() ||
        generateSummaryFallback(activities)[0],
      false,
    ];
  } catch (error) {
    console.error('Error generating LLM summary:', error);
    return generateSummaryFallback(activities);
  }
}

function generateSummaryFallback(
  activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): [string, boolean] {
  const mergedPRs = activities['pr_merged'];
  const releases = activities['release'];
  const commits = activities['commit'];
  if (mergedPRs.length == 0 && releases.length == 0 && commits.length == 0) {
    return ['No relevant GitHub changes in the last 24h.', true];
  }
  const parts: string[] = [];

  if (mergedPRs.length > 0) {
    parts.push(
      `${mergedPRs.length} pull request${mergedPRs.length > 1 ? 's' : ''} merged`,
    );
    parts.push(`including "${mergedPRs[0].title}"`);
  }

  if (releases.length > 0) {
    parts.push(
      `${releases.length} release${releases.length > 1 ? 's' : ''} published`,
    );
    parts.push(`including "${releases[0].title}"`);
  }

  // Always include commits if they exist - shows activity even if PRs aren't merged yet
  if (commits.length > 0) {
    if (mergedPRs.length === 0) {
      // If no PRs, show commit details
      parts.push(`${commits.length} commit${commits.length > 1 ? 's' : ''}`);
      parts.push(`including "${commits[0].title.substring(0, 60)}"`);
    } else {
      // If PRs exist, still mention commits to show activity
      parts.push(
        `${commits.length} additional commit${commits.length > 1 ? 's' : ''}`,
      );
    }
  }

  return [parts.join(', ') + '.', false];
}

/**
 * Generates an aggregate summary for multiple daily summaries across repos
 * Uses founder-level, non-cringe tone with concrete activity events
 */
export async function generateAggregateSummary(
  dailySummaries: string[],
  stats: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): Promise<string> {
  if (config.openai.apiKey) {
    return await generateAggregateSummaryLLM(dailySummaries, stats);
  } else {
    return generateAggregateSummaryFallback(stats);
  }
}

function generateAggregateSummaryFallback(
  stats: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): string {
  const parts: string[] = [];
  const mergedPRs = stats['pr_merged']?.length ?? 0;
  const releases = stats['release']?.length ?? 0;
  const commits = stats['commit']?.length ?? 0;
  const reposWithPRs = new Set(
    (stats['pr_merged'] ?? []).map((event) => event.repoId),
  );
  const reposWithReleases = new Set(
    (stats['release'] ?? []).map((event) => event.repoId),
  );

  if (mergedPRs) {
    parts.push(`${mergedPRs} pull request${mergedPRs > 1 ? 's' : ''} merged`);
  }

  if (releases > 0) {
    parts.push(`${releases} release${releases > 1 ? 's' : ''} published`);
  }

  if (commits > 0 && mergedPRs === 0) {
    parts.push(`${commits} commit${commits > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No meaningful changes across repositories in the last 7 days.';
  }

  return `Progress across ${reposWithPRs.size + reposWithReleases.size} repositories: ${parts.join(', ')}.`;
}

async function generateAggregateSummaryLLM(
  dailySummaries: string[],
  stats: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>,
): Promise<string> {
  if (dailySummaries.length === 0) {
    return 'No meaningful changes in the last 7 days.';
  }
  if (dailySummaries.length === 1) {
    return dailySummaries[0];
  }

  const prompt = `Generate a concise, specific founder update from the GitHub summaries below.

REQUIREMENTS:
- Never mention repository names - translate to product surfaces
- Focus on what was BUILT or ACCOMPLISHED, not just what was merged
- Recognize scope: "landing page" = entire new page built, "authentication" = full auth system, etc.
- Use impactful language that reflects the actual work done
- Include MORE bullet points if there's substantial content (up to 7-8 if warranted)
- Each bullet: strong verb, ≤140 chars, includes concrete details
- Use the daily summaries to understand the full context of what was done

LANGUAGE GUIDELINES:
- Say "Built new landing page" not "Merged landing page PR"
- Say "Implemented authentication system" not "Merged auth PR"
- Say "Added feature X" not "Merged PR for X"
- Recognize when substantial work was done and describe it accordingly
- If daily summaries provide more detail than activity events, use that detail

EXAMPLES:
- Good: "Built new landing page with modern SaaS design" or "Implemented Supabase JWT authentication system"
- Bad: "Merged landing page PR" or "2 pull requests merged"

Activity and summaries (last 7 days):
${dailySummaries.join('\n\n')}

Generate the summary (include more bullets if there's substantial content):`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You generate concise, specific founder updates. Always include actual PR titles, feature names, or concrete changes. Never say generic things like "X pull requests merged" or "Merged PR" - describe what was BUILT or ACCOMPLISHED. Recognize scope: a "landing page" PR means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the actual work: "Built", "Implemented", "Added", "Created" - not just "Merged". Never mention repository names. Be factual and specific. No hype words, no emojis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more factual output
      max_completion_tokens: 700, // Increased to allow for more bullet points
    });
    const llmResult = completion.choices[0]?.message?.content?.trim();
    if (llmResult) {
      console.log(
        `[Aggregate Summary] LLM generated summary (${llmResult.length} chars)`,
      );
      return llmResult;
    } else {
      console.log(`[Aggregate Summary] LLM returned empty, using fallback`);
      return generateAggregateSummaryFallback(stats);
    }
  } catch (error) {
    console.error('[Aggregate Summary] Error generating LLM summary:', error);
    return generateAggregateSummaryFallback(stats);
  }
}

export async function generateDailySummaries(): Promise<void> {
  try {
    const activeRepositoriesWithLatestSummary =
      await prisma.gitHubRepo.findMany({
        where: {
          isEnabled: true,
        },
        include: {
          dailySummaries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const repoTimeWindows = activeRepositoriesWithLatestSummary.map((repo) => {
      const maybeLatestSummaryDate = repo.dailySummaries[0]?.createdAt;
      return {
        repoId: repo.id,
        from: maybeLatestSummaryDate ?? sevenDaysAgo,
      };
    });

    const latestEvents = await prisma.repoActivityEvent.findMany({
      where: {
        OR: repoTimeWindows.map((window) => ({
          id: window.repoId,
          createdAt: {
            gt: window.from,
            lte: today,
          },
        })),
      },
      orderBy: { createdAt: 'desc' },
    });

    const eventsByRepoAndType = latestEvents.reduce<
      Record<string, Record<string, typeof latestEvents>>
    >((acc, event) => {
      const repoId = event.repoId;
      const type = event.type;

      acc[repoId] ??= {};
      (acc[repoId][type] ??= []).push(event);

      return acc;
    }, {});

    const promises = Object.entries(eventsByRepoAndType).map(
      async ([repoId, eventsByType]) => {
        const [summary, hasChanges] = await generateSummary(eventsByType);
        return [repoId, summary, hasChanges] as [string, string, boolean];
      },
    );

    const dailySummaries = await Promise.all(promises);

    const data = dailySummaries.map(([repoId, summary, noChanges]) => ({
      repoId,
      date: today,
      windowStart: repoTimeWindows.find((window) => window.repoId === repoId)!
        .from,
      windowEnd: today,
      summaryText: summary,
      noChanges,
    }));

    const result = await prisma.repoDailySummary.createMany({
      data,
    });
    console.log('Generate daily summaries finished', {
      createdSummaries: result.count,
    });
  } catch (error) {
    console.error('Failed to generate summaries', error);
  }
}

export async function generateWeeklyAggregateSummaries(): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const activeClientsWithDailySummariesAndActivity =
      await prisma.gitHubRepo.findMany({
        where: {
          isEnabled: true,
          installation: {
            client: {
              isNot: null,
            },
          },
        },
        include: {
          installation: {
            select: {
              client: {
                select: {
                  id: true,
                },
              },
            },
          },
          dailySummaries: {
            orderBy: { createdAt: 'desc' },
            where: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
          activityEvents: {
            orderBy: { createdAt: 'desc' },
            where: {
              createdAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
      });

    const summariesAndStatsByClient =
      activeClientsWithDailySummariesAndActivity.reduce<
        Record<
          string,
          {
            dailySummaries: string[];
            stats: Record<
              'pr_merged' | 'commit' | 'release',
              RepoActivityEvent[]
            >;
          }
        >
      >((acc, repo) => {
        acc[repo.installation.client!.id] ??= {
          dailySummaries: [],
          stats: { pr_merged: [], commit: [], release: [] },
        };
        const vals = acc[repo.installation.client!.id];
        vals.dailySummaries.push(
          ...repo.dailySummaries
            .filter((summary) => !summary.noChanges)
            .map((summary) => summary.summaryText),
        );
        for (const activity of repo.activityEvents) {
          if (['pr_merged', 'commit', 'release'].includes(activity.type)) {
            continue;
          }

          vals.stats[activity.type as 'pr_merged' | 'commit' | 'release'].push(
            activity,
          );
        }

        return acc;
      }, {});

    const promises = Object.entries(summariesAndStatsByClient).map(
      async ([clientId, { dailySummaries, stats }]) => {
        const summary = await generateAggregateSummary(dailySummaries, stats);
        return [clientId, summary] as [string, string];
      },
    );

    const weeklySummaries = await Promise.all(promises);
    const data = weeklySummaries.map(([clientId, summaryText]) => ({
      clientId,
      summaryText,
      date: today,
      windowStart: sevenDaysAgo,
      windowEnd: today,
    }));

    const result = await prisma.clientWeeklySummary.createMany({ data });
    console.log('Generate weekly summaries', {
      createdSummaries: result.count,
    });
  } catch (error) {
    console.error('Failed to generate weekly summaries', error);
  }
}
