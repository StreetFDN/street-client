import OpenAI from 'openai';
import { config } from '../config';
import { ActivityPacket } from './github/fetcher';
import {RepoActivityEvent} from "@prisma/client";

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generates a short summary of GitHub activity using LLM
 */
export async function generateSummary(activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>): Promise<string> {
  if (config.openai.apiKey) {
    return generateSummaryWithLLM(activities);
  } else {
    return generateSummaryFallback(activities);
  }
}

async function generateSummaryWithLLM(activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>): Promise<string> {
  const items: string[] = [];

  for (const pr of activities['pr_merged']) {
    items.push(`- Merged PR: "${pr.title}" by ${pr.author || 'unknown'} (${pr.url})`);
  }

  for (const release of activities['release']) {
    items.push(`- Release: "${release.title}" by ${release.author || 'unknown'} (${release.url})`);
  }

  for (const commit of (activities['commit']).slice(0, 10)) {
    // Limit commits in prompt
    items.push(`- Commit: "${commit.title}" by ${commit.author || 'unknown'} (${commit.url})`);
  }

  if (items.length === 0) {
    return 'No relevant GitHub changes in the last 24h.';
  }

  const prompt = `Summarize the following GitHub activity in a brief, factual paragraph. Be concise, technical, and slightly dry. No hype, no marketing language, no emojis. Focus on concrete changes and what was BUILT or ACCOMPLISHED, not just what was merged. Recognize scope: a "landing page" means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the work: "Built", "Implemented", "Added", "Created" - not just "Merged". INCLUDE all meaningful changes - don't filter out unless it's truly only assets/images/icons or formatting. Format as plain text, no markdown:

${items.join('\n')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are writing a founder-level technical update. Be concise, factual, and slightly dry. Assume the reader is technical and time-constrained. No hype, no marketing language, no emojis. Do not narrate emotions or intent. Prefer concrete changes over explanations. Describe what was BUILT or ACCOMPLISHED, not just what was merged. Recognize scope: a "landing page" means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the work: "Built", "Implemented", "Added", "Created" - not just "Merged". INCLUDE all meaningful changes including UI improvements, API changes, bug fixes, and features. Only exclude pure assets/images/icons or formatting-only changes. Goal is to show activity, not filter it out.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 200,
    });

    return completion.choices[0]?.message?.content?.trim() || generateSummaryFallback(activities);
  } catch (error) {
    console.error('Error generating LLM summary:', error);
    return generateSummaryFallback(activities);
  }
}

function generateSummaryFallback(activities: Record<'pr_merged' | 'commit' | 'release', RepoActivityEvent[]>): string {
  const mergedPRs = activities['pr_merged'];
  const releases = activities['release'];
  const commits = activities['commit'];
  if (mergedPRs.length == 0 && releases.length == 0 && commits.length == 0) {
    return 'No relevant GitHub changes in the last 24h.';
  }
  const parts: string[] = [];

  if (mergedPRs.length > 0) {
    parts.push(`${mergedPRs.length} pull request${mergedPRs.length > 1 ? 's' : ''} merged`);
    if (mergedPRs.length > 0) {
      parts.push(`including "${mergedPRs[0].title}"`);
    }
  }

  if (releases.length > 0) {
    parts.push(`${releases.length} release${releases.length > 1 ? 's' : ''} published`);
    if (releases.length > 0) {
      parts.push(`including "${releases[0].title}"`);
    }
  }

  // Always include commits if they exist - shows activity even if PRs aren't merged yet
  if (commits.length > 0) {
    if (mergedPRs.length === 0) {
      // If no PRs, show commit details
      parts.push(`${commits.length} commit${commits.length > 1 ? 's' : ''}`);
      if (commits.length > 0) {
        parts.push(`including "${commits[0].title.substring(0, 60)}"`);
      }
    } else {
      // If PRs exist, still mention commits to show activity
      parts.push(`${commits.length} additional commit${commits.length > 1 ? 's' : ''}`);
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

    // Always include summary texts for more context (even if we have events)
    // This gives the LLM more information about what was actually done
    const summaryTexts: string[] = [];
    const repoSummaryMap = new Map<string, string[]>();
    
    for (const summary of activeSummaries) {
      if (summary.repo && summary.summaryText && !summary.noChanges) {
        const repoName = `${summary.repo.owner}/${summary.repo.name}`;
        if (!repoSummaryMap.has(repoName)) {
          repoSummaryMap.set(repoName, []);
        }
        repoSummaryMap.get(repoName)!.push(summary.summaryText);
      }
    }
    
    // Add summary texts grouped by repo
    for (const [repoName, texts] of repoSummaryMap.entries()) {
      // Combine all daily summaries for this repo into one entry
      const combinedText = texts.join(' ');
      if (combinedText.length > 0) {
        summaryTexts.push(`[${repoName}] Daily summaries: ${combinedText.substring(0, 300)}`);
      }
    }
    
    // If no activity events, use summaries as primary source
    if (activityItems.length === 0) {
      console.log(`[Aggregate Summary] No activity events found (${activityEvents.length} events passed), using summary texts...`);
      activityItems.push(...summaryTexts);
      console.log(`[Aggregate Summary] Using ${activityItems.length} summary texts as fallback`);
    } else {
      // Add summary texts as additional context even when we have events
      console.log(`[Aggregate Summary] Adding ${summaryTexts.length} repo summary texts as additional context`);
      activityItems.push(...summaryTexts);
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
${activityItems.join('\n\n')}

Generate the summary (include more bullets if there's substantial content):`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You generate concise, specific founder updates. Always include actual PR titles, feature names, or concrete changes. Never say generic things like "X pull requests merged" or "Merged PR" - describe what was BUILT or ACCOMPLISHED. Recognize scope: a "landing page" PR means an entire page was built, "authentication" means a full system was implemented. Use language that reflects the actual work: "Built", "Implemented", "Added", "Created" - not just "Merged". Never mention repository names. Be factual and specific. No hype words, no emojis.',
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
