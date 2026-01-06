import OpenAI from 'openai';
import { config } from '../config';
import { ActivityPacket } from './github/fetcher';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generates a short summary of GitHub activity using LLM
 */
export async function generateSummary(activity: ActivityPacket): Promise<string> {
  if (config.openai.apiKey) {
    return generateSummaryWithLLM(activity);
  } else {
    return generateSummaryFallback(activity);
  }
}

async function generateSummaryWithLLM(activity: ActivityPacket): Promise<string> {
  const items: string[] = [];

  for (const pr of activity.mergedPRs) {
    items.push(`- Merged PR: "${pr.title}" by ${pr.author || 'unknown'} (${pr.url})`);
  }

  for (const release of activity.releases) {
    items.push(`- Release: "${release.title}" by ${release.author || 'unknown'} (${release.url})`);
  }

  for (const commit of activity.commits.slice(0, 10)) {
    // Limit commits in prompt
    items.push(`- Commit: "${commit.title}" by ${commit.author || 'unknown'} (${commit.url})`);
  }

  if (items.length === 0) {
    return 'No relevant GitHub changes in the last 24h.';
  }

  const prompt = `Summarize the following GitHub activity in a brief, factual paragraph. Be concise, technical, and slightly dry. No hype, no marketing language, no emojis. Focus on concrete changes. INCLUDE all meaningful changes - don't filter out unless it's truly only assets/images/icons or formatting. Format as plain text, no markdown:

${items.join('\n')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are writing a founder-level technical update. Be concise, factual, and slightly dry. Assume the reader is technical and time-constrained. No hype, no marketing language, no emojis. Do not narrate emotions or intent. Prefer concrete changes over explanations. INCLUDE all meaningful changes including UI improvements, API changes, bug fixes, and features. Only exclude pure assets/images/icons or formatting-only changes. Goal is to show activity, not filter it out.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || generateSummaryFallback(activity);
  } catch (error) {
    console.error('Error generating LLM summary:', error);
    return generateSummaryFallback(activity);
  }
}

function generateSummaryFallback(activity: ActivityPacket): string {
  if (activity.counts.mergedPRs === 0 && activity.counts.releases === 0 && activity.counts.commits === 0) {
    return 'No relevant GitHub changes in the last 24h.';
  }

  const parts: string[] = [];

  if (activity.counts.mergedPRs > 0) {
    parts.push(`${activity.counts.mergedPRs} pull request${activity.counts.mergedPRs > 1 ? 's' : ''} merged`);
    if (activity.mergedPRs.length > 0) {
      parts.push(`including "${activity.mergedPRs[0].title}"`);
    }
  }

  if (activity.counts.releases > 0) {
    parts.push(`${activity.counts.releases} release${activity.counts.releases > 1 ? 's' : ''} published`);
    if (activity.releases.length > 0) {
      parts.push(`including "${activity.releases[0].title}"`);
    }
  }

  // Always include commits if they exist - shows activity even if PRs aren't merged yet
  if (activity.counts.commits > 0) {
    if (activity.counts.mergedPRs === 0) {
      // If no PRs, show commit details
      parts.push(`${activity.counts.commits} commit${activity.counts.commits > 1 ? 's' : ''}`);
      if (activity.commits.length > 0) {
        parts.push(`including "${activity.commits[0].title.substring(0, 60)}"`);
      }
    } else {
      // If PRs exist, still mention commits to show activity
      parts.push(`${activity.counts.commits} additional commit${activity.counts.commits > 1 ? 's' : ''}`);
    }
  }

  return parts.join(', ') + '.';
}

/**
 * Generates an aggregate summary for multiple daily summaries across repos
 * Uses founder-level, non-cringe tone with concrete activity events
 */
export async function generateAggregateSummary(summaries: any[], activityEvents: any[] = []): Promise<string> {
  if (summaries.length === 0) {
    return 'No activity recorded in the last 7 days.';
  }

  // Filter out "no changes" summaries
  const activeSummaries = summaries.filter(s => !s.noChanges);

  if (activeSummaries.length === 0) {
    return 'No meaningful changes across repositories in the last 7 days.';
  }

  // Aggregate activity
  const stats = activeSummaries.reduce((acc, summary) => {
    if (summary.stats) {
      const s = summary.stats as any;
      acc.mergedPRs += s.mergedPRs || 0;
      acc.releases += s.releases || 0;
      acc.commits += s.commits || 0;
      if (s.mergedPRs > 0) acc.reposWithPRs.add(summary.repoId);
      if (s.releases > 0) acc.reposWithReleases.add(summary.repoId);
    }
    return acc;
  }, { 
    mergedPRs: 0, 
    releases: 0, 
    commits: 0,
    reposWithPRs: new Set<string>(),
    reposWithReleases: new Set<string>(),
  });

  // If we have OpenAI, generate a summary
  if (config.openai.apiKey) {
    console.log(`[Aggregate Summary] OpenAI key found, generating LLM summary. Activity events: ${activityEvents.length}, Summaries: ${activeSummaries.length}`);
    
    // Build concrete activity list from actual events
    const activityItems: string[] = [];
    const repoNames = new Set<string>();

    // Group events by type and repo
    const prs: any[] = [];
    const releases: any[] = [];
    const commits: any[] = [];

    for (const event of activityEvents) {
      if (event.repo) {
        repoNames.add(`${event.repo.owner}/${event.repo.name}`);
      }

      if (event.type === 'pr_merged') {
        prs.push({
          repo: event.repo ? `${event.repo.owner}/${event.repo.name}` : 'unknown',
          title: event.title,
          url: event.url,
        });
      } else if (event.type === 'release') {
        releases.push({
          repo: event.repo ? `${event.repo.owner}/${event.repo.name}` : 'unknown',
          title: event.title,
          url: event.url,
        });
      } else if (event.type === 'commit') {
        commits.push({
          repo: event.repo ? `${event.repo.owner}/${event.repo.name}` : 'unknown',
          title: event.title,
          url: event.url,
        });
      }
    }

    console.log(`[Aggregate Summary] Grouped events - PRs: ${prs.length}, Releases: ${releases.length}, Commits: ${commits.length}`);

    // Build concrete activity list
    for (const pr of prs.slice(0, 15)) {
      activityItems.push(`[${pr.repo}] Merged PR: "${pr.title}"`);
    }

    for (const release of releases.slice(0, 10)) {
      activityItems.push(`[${release.repo}] Release: "${release.title}"`);
    }

    // Include commits if no PRs, or if commits are significant (many commits = likely important)
    if (prs.length === 0 && commits.length > 0) {
      for (const commit of commits.slice(0, 10)) {
        activityItems.push(`[${commit.repo}] Commit: "${commit.title}"`);
      }
    } else if (commits.length > 5 && prs.length < 3) {
      // If many commits but few PRs, include representative commits
      for (const commit of commits.slice(0, 5)) {
        activityItems.push(`[${commit.repo}] Commit: "${commit.title}"`);
      }
    }

    // If no activity events found, try using summary texts as fallback
    if (activityItems.length === 0) {
      console.log(`[Aggregate Summary] No activity events found (${activityEvents.length} events passed), checking summaries...`);
      // Fall back to using summary texts if events aren't available yet
      for (const summary of activeSummaries.slice(0, 10)) {
        if (summary.repo && summary.summaryText && !summary.noChanges) {
          const repoName = `${summary.repo.owner}/${summary.repo.name}`;
          activityItems.push(`[${repoName}] ${summary.summaryText.substring(0, 200)}`);
        }
      }
      console.log(`[Aggregate Summary] Using ${activityItems.length} summary texts as fallback`);
    }

    if (activityItems.length === 0) {
      console.log(`[Aggregate Summary] No activity items found, returning quiet week message`);
      return 'Quiet shipping week. Focused on polish and reliability.';
    }

    console.log(`[Aggregate Summary] Sending ${activityItems.length} activity items to LLM`);

    const prompt = `Generate a concise, specific founder update from the GitHub activity below.

REQUIREMENTS:
- Be SPECIFIC: Include actual PR titles, feature names, or concrete changes
- Never mention repository names - translate to product surfaces
- Focus on what was built or changed, not generic counts
- 1 headline + 3-5 bullet points
- Each bullet: strong verb, ≤140 chars, includes concrete details

EXAMPLES:
- Good: "Added Supabase JWT authentication support" or "Fixed TypeScript errors in auth routes"
- Bad: "2 pull requests merged" or "Progress across repositories"

Activity (last 7 days):
${activityItems.join('\n\n')}

Generate the summary:`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You generate concise, specific founder updates. Always include actual PR titles, feature names, or concrete changes. Never say generic things like "X pull requests merged" - say WHAT was merged. Never mention repository names. Be factual and specific. No hype words, no emojis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more factual output
        max_tokens: 500,
      });

      const llmResult = completion.choices[0]?.message?.content?.trim();
      if (llmResult) {
        console.log(`[Aggregate Summary] LLM generated summary (${llmResult.length} chars)`);
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

  // Fallback to template (no OpenAI key)
  console.log(`[Aggregate Summary] No OpenAI key, using template fallback`);
  return generateAggregateSummaryFallback(stats);
}

function generateAggregateSummaryFallback(stats: any): string {
  const parts: string[] = [];

  if (stats.mergedPRs > 0) {
    parts.push(`${stats.mergedPRs} pull request${stats.mergedPRs > 1 ? 's' : ''} merged`);
  }

  if (stats.releases > 0) {
    parts.push(`${stats.releases} release${stats.releases > 1 ? 's' : ''} published`);
  }

  if (stats.commits > 0 && stats.mergedPRs === 0) {
    parts.push(`${stats.commits} commit${stats.commits > 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'No meaningful changes across repositories in the last 7 days.';
  }

  return `Progress across ${stats.reposWithPRs.size + stats.reposWithReleases.size} repositories: ${parts.join(', ')}.`;
}
