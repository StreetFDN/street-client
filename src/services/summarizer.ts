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

  const prompt = `Summarize the following GitHub activity in a brief, factual paragraph. Be concise, technical, and slightly dry. No hype, no marketing language, no emojis. Focus on concrete changes. Format as plain text, no markdown:

${items.join('\n')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are writing a founder-level technical update. Be concise, factual, and slightly dry. Assume the reader is technical and time-constrained. No hype, no marketing language, no emojis. Do not narrate emotions or intent. Prefer concrete changes over explanations. If progress is small, say so plainly. Goal is credibility, not excitement.',
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

  if (activity.counts.commits > 0) {
    parts.push(`${activity.counts.commits} commit${activity.counts.commits > 1 ? 's' : ''}`);
  }

  return parts.join(', ') + '.';
}

/**
 * Generates an aggregate summary for multiple daily summaries across repos
 * Uses founder-level, non-cringe tone
 */
export async function generateAggregateSummary(summaries: any[]): Promise<string> {
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
    const items: string[] = [];
    
    if (stats.mergedPRs > 0) {
      items.push(`${stats.mergedPRs} pull request${stats.mergedPRs > 1 ? 's' : ''} merged across ${stats.reposWithPRs.size} repo${stats.reposWithPRs.size > 1 ? 's' : ''}`);
    }
    
    if (stats.releases > 0) {
      items.push(`${stats.releases} release${stats.releases > 1 ? 's' : ''} published across ${stats.reposWithReleases.size} repo${stats.reposWithReleases.size > 1 ? 's' : ''}`);
    }
    
    if (stats.commits > 0 && stats.mergedPRs === 0) {
      items.push(`${stats.commits} commit${stats.commits > 1 ? 's' : ''}`);
    }

    if (items.length === 0) {
      return 'No meaningful changes across repositories in the last 7 days.';
    }

    const prompt = `Summarize the following aggregated GitHub activity across multiple repositories over 7 days. Write in a founder-level, technical tone. Be concise, factual, and slightly dry. No hype, no marketing language, no emojis. Assume the reader is technical and time-constrained. Focus on concrete changes. Format as: one-sentence summary, then 3-6 short bullet points (max 140 chars each):

${items.join('\n')}

Structure:
1. One-sentence summary of what changed.
2. 3-6 short bullet points (max 140 chars each).
3. Optional: one risk or open question if relevant.`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are writing a founder-level technical update for stakeholders. Be concise, factual, and slightly dry. No hype, no marketing language, no emojis. Do not narrate emotions or intent. Prefer concrete changes over explanations. If progress is small, say so plainly. Goal is credibility, not excitement.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return completion.choices[0]?.message?.content?.trim() || generateAggregateSummaryFallback(stats);
    } catch (error) {
      console.error('Error generating aggregate LLM summary:', error);
      return generateAggregateSummaryFallback(stats);
    }
  }

  // Fallback to template
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
