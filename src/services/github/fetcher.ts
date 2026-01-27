import { Octokit } from '@octokit/rest';
import { getInstallationOctokit } from './auth';

export interface ActivityEvent {
  type:
    | 'commit'
    | 'pr_merged'
    | 'pr_opened'
    | 'issue_closed'
    | 'release'
    | 'tag'
    | 'ci';
  title: string;
  url: string;
  author: string | null;
  occurredAt: Date;
  additions?: number;
  deletions?: number;
  metadata?: Record<string, any>;
}

export interface ActivityPacket {
  mergedPRs: ActivityEvent[];
  releases: ActivityEvent[];
  commits: ActivityEvent[];
  counts: {
    mergedPRs: number;
    releases: number;
    commits: number;
  };
}

const MAX_COMMITS = 30;
const MAX_PRS = 20;

/**
 * Fetches GitHub activity for a repo within a time window
 */
export async function fetchRepoActivity(
  installationId: number,
  owner: string,
  repo: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<ActivityPacket> {
  const octokit = await getInstallationOctokit(installationId);

  const mergedPRs: ActivityEvent[] = [];
  const releases: ActivityEvent[] = [];
  const commits: ActivityEvent[] = [];

  // Fetch merged PRs
  try {
    const prResponse = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: MAX_PRS,
    });

    for (const pr of prResponse.data) {
      if (pr.merged_at) {
        const mergedAt = new Date(pr.merged_at);
        if (mergedAt >= windowStart && mergedAt <= windowEnd) {
          mergedPRs.push({
            type: 'pr_merged',
            title: pr.title,
            url: pr.html_url,
            author: pr.user?.login || null,
            occurredAt: mergedAt,
            additions: (pr as any).additions || 0,
            deletions: (pr as any).deletions || 0,
            metadata: {
              number: pr.number,
              labels: pr.labels?.map((l: any) => l.name) || [],
            },
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching PRs for ${owner}/${repo}:`, error);
  }

  // Fetch releases
  try {
    const releasesResponse = await octokit.rest.repos.listReleases({
      owner,
      repo,
      per_page: 100,
    });

    for (const release of releasesResponse.data) {
      const publishedAt = release.published_at
        ? new Date(release.published_at)
        : null;
      if (
        publishedAt &&
        publishedAt >= windowStart &&
        publishedAt <= windowEnd
      ) {
        releases.push({
          type: 'release',
          title: release.name || release.tag_name,
          url: release.html_url,
          author: release.author?.login || null,
          occurredAt: publishedAt,
          metadata: {
            tag: release.tag_name,
            prerelease: release.prerelease,
            draft: release.draft,
          },
        });
      }
    }
  } catch (error) {
    console.error(`Error fetching releases for ${owner}/${repo}:`, error);
  }

  // Always fetch commits (PRs might not be merged yet, and commits show direct activity)
  try {
    const commitsResponse = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: windowStart.toISOString(),
      until: windowEnd.toISOString(),
      per_page: MAX_COMMITS,
    });

    for (const commit of commitsResponse.data) {
      const commitDate = new Date(
        commit.commit.author?.date ||
          commit.commit.committer?.date ||
          Date.now(),
      );
      if (commitDate >= windowStart && commitDate <= windowEnd) {
        const message = commit.commit.message.split('\n')[0]; // First line only

        // Skip merge commits and dependabot/automated commits unless they're the only activity
        const isMergeCommit =
          message.toLowerCase().startsWith('merge') ||
          message.toLowerCase().startsWith('merging');
        const isAutomated =
          commit.author?.login?.includes('dependabot') ||
          commit.author?.login?.includes('bot') ||
          commit.commit.author?.name?.includes('bot');

        // Only skip if we have PRs - if no PRs, include everything to show activity
        if (
          !isMergeCommit &&
          (!isAutomated || (mergedPRs.length === 0 && releases.length === 0))
        ) {
          commits.push({
            type: 'commit',
            title: message,
            url: commit.html_url,
            author: commit.author?.login || commit.commit.author?.name || null,
            occurredAt: commitDate,
            metadata: {
              sha: commit.sha,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
  }

  return {
    mergedPRs,
    releases,
    commits,
    counts: {
      mergedPRs: mergedPRs.length,
      releases: releases.length,
      commits: commits.length,
    },
  };
}
