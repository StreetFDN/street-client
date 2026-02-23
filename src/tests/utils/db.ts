import { prisma } from 'db';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "RepoSyncRun",
      "RepoDailySummary",
      "RepoActivityEvent",
      "GitHubRepo",
      "GitHubInstallation",
      "ClientTokens",
      "Token",
      "XPostSnapshot",
      "XAccountSnapshot",
      "XAccount",
      "SharedClientAccess",
      "UserRoleForClient",
      "Client",
      "GithubAccount",
      "SupabaseAccount",
      "User"
    CASCADE;
  `);
}

export async function createSupabaseAccount() {
  return prisma.supabaseAccount.create({
    data: {
      id: crypto.randomUUID(),
    },
  });
}

export async function createUser(params?: {
  email?: string;
  name?: string;
  superUser?: boolean;
}) {
  const supabaseAccount = await createSupabaseAccount();
  return prisma.user.create({
    data: {
      name: params?.name ?? `User ${crypto.randomUUID()}`,
      email: params?.email ?? `user-${crypto.randomUUID()}@example.com`,
      superUser: params?.superUser ?? false,
      supabaseAccountId: supabaseAccount.id,
    },
  });
}

export async function createClient(params?: { name?: string }) {
  return prisma.client.create({
    data: {
      name: params?.name ?? `client-${crypto.randomUUID()}`,
    },
  });
}

export async function attachUserToClient(params: {
  userId: string;
  clientId: string;
  role: UserRole;
  sharedAccessId?: string | null;
}) {
  return prisma.userRoleForClient.create({
    data: {
      userId: params.userId,
      clientId: params.clientId,
      role: params.role,
      sharedAccessId: params.sharedAccessId ?? null,
    },
  });
}

export async function createGithubAccount(params?: {
  login?: string;
  githubId?: number;
}) {
  return prisma.githubAccount.create({
    data: {
      login: params?.login ?? `gh-${crypto.randomUUID()}`,
      githubId: params?.githubId ?? Math.floor(Math.random() * 1000000),
    },
  });
}

export async function createInstallation(params: { clientId: string }) {
  const creator = await createGithubAccount();
  const installation = await prisma.gitHubInstallation.create({
    data: {
      githubId: Math.floor(Math.random() * 1000000),
      creatorId: creator.id,
      client: {
        connect: {
          id: params.clientId,
        },
      },
    },
  });

  await prisma.client.update({
    where: { id: params.clientId },
    data: { githubInstallationId: installation.id },
  });

  return installation;
}

export async function createRepo(params: {
  installationId: string;
  owner?: string;
  name?: string;
  isEnabled?: boolean;
}) {
  return prisma.gitHubRepo.create({
    data: {
      installationId: params.installationId,
      owner: params.owner ?? 'octo',
      name: params.name ?? `repo-${crypto.randomUUID()}`,
      githubId: Math.floor(Math.random() * 1000000),
      isPrivate: false,
      isEnabled: params.isEnabled ?? true,
    },
  });
}

export async function createDailySummary(params: {
  repoId: string;
  date: Date;
  windowStart: Date;
  windowEnd: Date;
  summaryText?: string;
  noChanges?: boolean;
  stats?: Record<string, number>;
}) {
  return prisma.repoDailySummary.create({
    data: {
      repoId: params.repoId,
      date: params.date,
      windowStart: params.windowStart,
      windowEnd: params.windowEnd,
      summaryText: params.summaryText ?? 'Summary',
      stats: params.stats ?? { commits: 1 },
      noChanges: params.noChanges ?? false,
    },
  });
}

export async function createToken(params?: {
  address?: string;
  chainId?: string;
}) {
  return prisma.token.create({
    data: {
      address: params?.address ?? '0x0000000000000000000000000000000000000001',
      chainId: params?.chainId ?? '1',
    },
  });
}

export async function attachTokenToClient(params: {
  clientId: string;
  tokenId: string;
}) {
  return prisma.clientTokens.create({
    data: {
      clientId: params.clientId,
      tokenId: params.tokenId,
    },
  });
}

export async function createActivityEvent(params: {
  repoId: string;
  occurredAt: Date;
  type?: string;
  title?: string;
  url?: string;
  author?: string | null;
}) {
  return prisma.repoActivityEvent.create({
    data: {
      repoId: params.repoId,
      githubId: crypto.randomUUID(),
      occurredAt: params.occurredAt,
      type: params.type ?? 'commit',
      title: params.title ?? 'Activity',
      url: params.url ?? 'https://example.com',
      author: params.author ?? null,
    },
  });
}

export async function createXAccount(params: {
  clientId: string;
  userId?: string;
  username?: string | null;
  profileUrl?: string | null;
}) {
  return prisma.xAccount.create({
    data: {
      clientId: params.clientId,
      userId: params.userId ?? crypto.randomUUID(),
      username: params.username ?? null,
      profileUrl: params.profileUrl ?? null,
    },
  });
}

export async function createXAccountSnapshot(params: {
  xAccountId: string;
  followers: number;
  createdAt?: Date;
}) {
  return prisma.xAccountSnapshot.create({
    data: {
      xAccountId: params.xAccountId,
      followers: params.followers,
      createdAt: params.createdAt ?? new Date(),
    },
  });
}

export async function createXPostSnapshot(params: {
  xAccountId: string;
  postId?: string;
  postCreatedAt?: Date;
  createdAt?: Date;
  likes?: number;
  reposts?: number;
  replies?: number;
  impressions?: number | null;
}) {
  return prisma.xPostSnapshot.create({
    data: {
      xAccountId: params.xAccountId,
      postId: params.postId ?? crypto.randomUUID(),
      postCreatedAt: params.postCreatedAt ?? new Date(),
      createdAt: params.createdAt ?? new Date(),
      likes: params.likes ?? 0,
      reposts: params.reposts ?? 0,
      replies: params.replies ?? 0,
      impressions: params.impressions ?? null,
    },
  });
}
