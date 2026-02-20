import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createActivityEvent,
  createClient,
  createInstallation,
  createRepo,
  createUser,
} from 'tests/utils/db';
import { UserRole } from '@prisma/client';

const app = createTestApp();

describe('activity routes', () => {
  it('lists activity with pagination', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const event1 = await createActivityEvent({
      repoId: repo.id,
      occurredAt: new Date('2026-02-02T10:00:00Z'),
      title: 'First',
    });
    await createActivityEvent({
      repoId: repo.id,
      occurredAt: new Date('2026-02-01T10:00:00Z'),
      title: 'Second',
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/repos/${repo.id}/activity`)
      .query({ limit: 1 })
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('First');
    expect(response.body.pagination.offsetId).toBe(event1.id);
  });

  it('returns 400 for invalid offsetId', async () => {
    const user = await createUser();
    const client = await createClient();
    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/repos/${repo.id}/activity`)
      .query({ offsetId: '00000000-0000-0000-0000-000000000000' })
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(400);
  });
});
