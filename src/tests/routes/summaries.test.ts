import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createClient,
  createDailySummary,
  createInstallation,
  createRepo,
  createUser,
} from 'tests/utils/db';
import { prisma } from 'db';
import { UserRole } from '@prisma/client';

const app = createTestApp();

describe('summaries routes', () => {
  it('lists repo summaries with date filters', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const day1 = new Date('2026-02-01T00:00:00Z');
    const day2 = new Date('2026-02-02T00:00:00Z');
    await createDailySummary({
      repoId: repo.id,
      date: day1,
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-01T23:59:59Z'),
    });
    await createDailySummary({
      repoId: repo.id,
      date: day2,
      windowStart: new Date('2026-02-02T00:00:00Z'),
      windowEnd: new Date('2026-02-02T23:59:59Z'),
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/repos/${repo.id}/summaries`)
      .query({ from: '2026-02-02', to: '2026-02-02' })
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('lists client summaries across repos', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repoA = await createRepo({
      installationId: installation.id,
      name: 'a',
    });
    const repoB = await createRepo({
      installationId: installation.id,
      name: 'b',
    });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const date = new Date('2026-02-01T00:00:00Z');
    await createDailySummary({
      repoId: repoA.id,
      date,
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-01T23:59:59Z'),
    });
    await createDailySummary({
      repoId: repoB.id,
      date,
      windowStart: new Date('2026-02-01T00:00:00Z'),
      windowEnd: new Date('2026-02-01T23:59:59Z'),
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/summaries`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it('returns 7-day summary for client', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    await createDailySummary({
      repoId: repo.id,
      date,
      windowStart: new Date(date),
      windowEnd: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      stats: { mergedPRs: 1 },
    });

    await prisma.repoActivityEvent.create({
      data: {
        repoId: repo.id,
        githubId: '1',
        occurredAt: new Date(),
        type: 'pr_merged',
        title: 'Test PR',
        url: 'https://example.com',
      },
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/summary/7days`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.stats.mergedPRs).toBeDefined();
  });

  it('returns repo-by-repo summaries for client', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    await createDailySummary({
      repoId: repo.id,
      date,
      windowStart: new Date(date),
      windowEnd: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      stats: { commits: 2 },
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/summary/repos`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.repos).toHaveLength(1);
  });
});
