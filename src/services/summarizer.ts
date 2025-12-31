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

  const prompt = `Summarize the following GitHub activity in a brief, professional paragraph (2-3 sentences max). Focus on what was accomplished, not individual details. Format as plain text, no markdown:

${items.join('\n')}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer creating brief daily development summaries. Be concise and professional.',
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
