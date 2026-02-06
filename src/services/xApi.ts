import { prisma } from 'db';
import { createSearchTweetsQueryBatches, fetchXApi } from 'utils/xApi';
import { chunkArray } from 'utils/array';
import { nok, ok } from 'utils/result';
import { Tweet, UserResult } from 'types/xApi';

const USER_BATCH_SIZE = 100;

export async function syncXAccounts(): Promise<void> {
  // TODO(mlacko): Add ability to disable clients, skip accounts of disabled clients.
  const xAccounts = await prisma.xAccount.findMany();

  if (xAccounts.length === 0) {
    return;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const userIds = new Set(...xAccounts.map((account) => account.userId));
  const userResultsByIds = await fetchUsersByIds(userIds);

  const snapshotEntries = xAccounts
    .map((account) => {
      const userResult = userResultsByIds.get(account.userId);
      if (!userResult?.ok) {
        // TODO(mlacko): Handle failed user queries.
        return null;
      }

      const user = userResult.data;
      const followers = user.public_metrics.followers_count;

      return {
        xAccountId: account.id,
        followers,
        createdAt: now,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);

  if (snapshotEntries.length > 0) {
    await prisma.xAccountSnapshot.createMany({
      data: snapshotEntries,
    });
  }

  const usernames = xAccounts
    .map((account) => {
      const userResult = userResultsByIds.get(account.userId);
      if (!userResult?.ok) {
        return null;
      }

      return userResult.data.username;
    })
    .filter((entry): entry is string => entry != null);

  const tweetsByUserId = await fetchUsersTweetsLast24h(usernames, windowStart);

  for (const account of xAccounts) {
    try {
      const userResult = userResultsByIds.get(account.userId);
      if (!userResult?.ok) {
        console.warn(
          `X API sync skipped: user ${account.userId} not found.`,
          userResult?.error ?? { detail: 'User disappeared' },
        );
        continue;
      }

      const user = userResult.data;
      const profileUrl = `https://x.com/${user.username}`;

      const userTweets = tweetsByUserId.get(account.userId) ?? [];

      if (userTweets.length > 0) {
        await prisma.xPostSnapshot.createMany({
          data: userTweets.map((tweet) => ({
            xAccountId: account.id,
            postId: tweet.id,
            postCreatedAt: tweet.created_at,
            likes: tweet.public_metrics.like_count,
            reposts: tweet.public_metrics.retweet_count,
            replies: tweet.public_metrics.reply_count,
            impressions: tweet.public_metrics.impression_count,
            createdAt: now,
          })),
        });
      }

      await prisma.xAccount.update({
        where: {
          id: account.id,
        },
        data: {
          username: user.username ?? account.username,
          profileUrl: profileUrl ?? account.profileUrl,
          lastSyncedAt: now,
        },
      });
    } catch (error) {
      console.error(`X API sync failed for XAccount ${account.id}:`, error);
    }
  }
}

export async function fetchUsersByIds(
  userIds: Set<string>,
): Promise<Map<string, UserResult>> {
  const usersById = new Map<string, UserResult>();
  const batches = chunkArray([...userIds], USER_BATCH_SIZE);

  for (const batch of batches) {
    const response = await fetchXApi('/users', {
      ids: batch,
      'user.fields': ['public_metrics'],
    });

    const processedIds = new Set();
    for (const user of response.data ?? []) {
      usersById.set(user.id, ok(user));
      processedIds.add(user.id);
    }

    for (const userError of response.error ?? []) {
      if (userError.resource_type === 'user') {
        usersById.set(userError.resource_id!, nok(userError));
        processedIds.add(userError.resource_id!);
      }
    }

    if (processedIds.size !== batch.length) {
      for (const requestedId of batch) {
        if (processedIds.has(requestedId)) {
          continue;
        }
        usersById.set(
          requestedId,
          nok({
            title: 'Failed To Fetch',
            detail: `Missing user from X API response, with id: [${requestedId}]`,
            type: 'Internal',
            resource_type: 'user',
            resource_id: requestedId.toString(),
          }),
        );
      }
    }
  }

  return usersById;
}

export async function fetchUsersTweetsLast24h(
  usernames: string[],
  windowStart: Date,
): Promise<Map<string, Tweet[]>> {
  const tweetsByUserId = new Map<string, Tweet[]>();
  const queryBatches = createSearchTweetsQueryBatches(usernames);

  for (const query of queryBatches) {
    let paginationToken: string | undefined;

    do {
      const response = await fetchXApi('/tweets/search/recent', {
        query,
        start_time: windowStart.toISOString(),
        max_results: '100',
        'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
        ...(paginationToken != null
          ? { pagination_token: paginationToken }
          : {}),
      });

      for (const tweet of response.data ?? []) {
        if (!tweetsByUserId.has(tweet.author_id)) {
          tweetsByUserId.set(tweet.author_id, []);
        }

        tweetsByUserId.get(tweet.author_id)!.push(tweet);
      }

      paginationToken = response.meta?.next_token;
    } while (paginationToken != null);
  }

  return tweetsByUserId;
}
