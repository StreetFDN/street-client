import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createClient,
  createUser,
  createXAccount,
  createXAccountSnapshot,
  createXPostSnapshot,
} from 'tests/utils/db';
import { UserRole } from '@prisma/client';

const app = createTestApp();

describe('social routes', () => {
  it('returns follower snapshots within window', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const xAccount = await createXAccount({ clientId: client.id });

    await createXAccountSnapshot({
      xAccountId: xAccount.id,
      followers: 10,
      createdAt: new Date('2026-02-01T00:00:00Z'),
    });
    await createXAccountSnapshot({
      xAccountId: xAccount.id,
      followers: 20,
      createdAt: new Date('2026-02-03T00:00:00Z'),
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/social/x/followers-metrics`)
      .query({
        start_time: '2026-02-02T00:00:00Z',
        end_time: '2026-02-04T00:00:00Z',
      })
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.snapshots).toHaveLength(1);
    expect(response.body.snapshots[0].followers).toBe(20);
  });

  it('returns post metrics aggregated by snapshot window', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const xAccount = await createXAccount({ clientId: client.id });
    const createdAt = new Date('2026-02-05T00:00:00Z');

    await createXPostSnapshot({
      xAccountId: xAccount.id,
      createdAt,
      likes: 3,
      reposts: 1,
      replies: 1,
      impressions: 10,
    });
    await createXPostSnapshot({
      xAccountId: xAccount.id,
      createdAt,
      likes: 2,
      reposts: 2,
      replies: 0,
      impressions: 5,
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/social/x/post-metrics`)
      .query({
        start_time: '2026-02-01T00:00:00Z',
        end_time: '2026-02-06T00:00:00Z',
      })
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.snapshots).toHaveLength(1);
    expect(response.body.snapshots[0].likes).toBe(5);
    expect(response.body.snapshots[0].reposts).toBe(3);
    expect(response.body.snapshots[0].replies).toBe(1);
    expect(response.body.snapshots[0].impressions).toBe(15);
  });
});
