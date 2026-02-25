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

const app = createTestApp();

describe('repos routes', () => {
  it('lists repos for a client', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const installation = await createInstallation({ clientId: client.id });
    await createRepo({
      installationId: installation.id,
      owner: 'octo',
      name: 'alpha',
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}/repos`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].fullName).toBe('octo/alpha');
  });

  it('lists repos for an installation', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const installation = await createInstallation({ clientId: client.id });
    await createRepo({
      installationId: installation.id,
      owner: 'octo',
      name: 'beta',
    });

    const response = await request(app)
      .get(`/api/installations/${installation.id}/repos`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].fullName).toBe('octo/beta');
  });

  it('enables and disables repo with admin access', async () => {
    const admin = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const installation = await createInstallation({ clientId: client.id });
    const repo = await createRepo({
      installationId: installation.id,
      isEnabled: false,
    });

    const enabled = await request(app)
      .post(`/api/repos/${repo.id}/enable`)
      .set('x-test-user-id', admin.id);

    expect(enabled.status).toBe(200);
    expect(enabled.body.repo.isEnabled).toBe(true);

    const disabled = await request(app)
      .post(`/api/repos/${repo.id}/disable`)
      .set('x-test-user-id', admin.id);

    expect(disabled.status).toBe(200);
    expect(disabled.body.repo.isEnabled).toBe(false);
  });

  it('blocks repo enable for non-admin users', async () => {
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
      .post(`/api/repos/${repo.id}/enable`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(403);
  });
});
