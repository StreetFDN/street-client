import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createClient,
  createInstallation,
  createUser,
} from 'tests/utils/db';
import { UserRole } from '@prisma/client';
import { prisma } from 'db';
import { getInstallationOctokit } from 'services/github/auth';
import { backfillRepo } from 'services/sync';

jest.mock('services/github/auth', () => ({
  getInstallationOctokit: jest.fn(),
}));

jest.mock('services/sync', () => ({
  backfillRepo: jest.fn(),
}));

const app = createTestApp();

describe('installations routes', () => {
  it('syncs repos for installation with admin access', async () => {
    const admin = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const installation = await createInstallation({ clientId: client.id });

    (getInstallationOctokit as jest.Mock).mockResolvedValue({
      rest: {
        apps: {
          listReposAccessibleToInstallation: jest.fn().mockResolvedValue({
            data: {
              repositories: [
                {
                  id: 123,
                  owner: { login: 'octo' },
                  name: 'alpha',
                  private: false,
                },
              ],
            },
          }),
        },
      },
    });

    const response = await request(app)
      .post(`/api/installations/${installation.id}/sync`)
      .set('x-test-user-id', admin.id);

    expect(response.status).toBe(200);
    expect(response.body.synced).toBe(1);

    const repo = await prisma.gitHubRepo.findUnique({
      where: { githubId: 123 },
    });
    expect(repo).not.toBeNull();
    expect(backfillRepo).toHaveBeenCalled();
  });

  it('blocks sync for non-admin users', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const installation = await createInstallation({ clientId: client.id });

    const response = await request(app)
      .post(`/api/installations/${installation.id}/sync`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(403);
  });
});
