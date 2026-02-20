import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createClient,
  createInstallation,
  createRepo,
  createUser,
} from 'tests/utils/db';
import { UserRole } from '@prisma/client';
import { syncAllReposDaily, syncRepo } from 'services/sync';

jest.mock('services/sync', () => ({
  syncAllReposDaily: jest.fn().mockResolvedValue(undefined),
  syncRepo: jest.fn().mockResolvedValue(undefined),
}));

const app = createTestApp();

describe('sync routes', () => {
  it('triggers manual sync for all repos', async () => {
    const response = await request(app)
      .post('/api/sync/trigger')
      .set('x-test-user-id', 'user-123');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('started');
    expect(syncAllReposDaily).toHaveBeenCalled();
  });

  it('triggers repo sync for admins', async () => {
    const admin = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    const response = await request(app)
      .post(`/api/sync/repos/${repo.id}`)
      .set('x-test-user-id', admin.id);

    expect(response.status).toBe(200);
    expect(response.body.repoId).toBe(repo.id);
    expect(syncRepo).toHaveBeenCalledWith(
      repo.id,
      expect.any(Date),
      expect.any(Date),
      'daily',
    );
  });

  it('blocks repo sync for non-admins', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({ installationId: installation.id });

    const response = await request(app)
      .post(`/api/sync/repos/${repo.id}`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(403);
  });
});
