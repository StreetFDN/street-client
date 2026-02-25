import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachUserToClient,
  createClient,
  createUser,
  createXAccount,
} from 'tests/utils/db';
import { prisma } from 'db';
import { UserRole } from '@prisma/client';

const app = createTestApp();

describe('clients routes', () => {
  it('lists clients for a user', async () => {
    const user = await createUser();
    const client = await createClient();

    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const response = await request(app)
      .get('/api/clients')
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].role).toBe(UserRole.USER);
  });

  it('GET /api/clients/:clientId returns xAccount when client has linked X account', async () => {
    const user = await createUser();
    const client = await createClient({ name: 'Client with X' });
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });
    const lastSyncedAt = new Date('2025-01-15T12:00:00Z');
    const xAccount = await createXAccount({
      clientId: client.id,
      username: 'testhandle',
      profileUrl: 'https://x.com/testhandle',
    });
    await prisma.xAccount.update({
      where: { id: xAccount.id },
      data: { lastSyncedAt },
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.xAccount).toEqual({
      id: xAccount.id,
      username: 'testhandle',
      profileUrl: 'https://x.com/testhandle',
      lastSyncedAt: lastSyncedAt.toISOString(),
    });
  });

  it('GET /api/clients/:clientId returns xAccount null when client has no linked X account', async () => {
    const user = await createUser();
    const client = await createClient({ name: 'Client without X' });
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const response = await request(app)
      .get(`/api/clients/${client.id}`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body.xAccount).toBeNull();
  });

  it('creates client only for superUser', async () => {
    const adminUser = await createUser({ email: 'admin@example.com' });
    const normalUser = await createUser();
    const superUser = await createUser({ superUser: true });

    const forbidden = await request(app)
      .post('/api/clients')
      .set('x-test-user-id', normalUser.id)
      .send({ name: 'New Client', administratorEmail: adminUser.email });

    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post('/api/clients')
      .set('x-test-user-id', superUser.id)
      .send({ name: 'New Client', administratorEmail: adminUser.email });

    expect(created.status).toBe(201);

    const role = await prisma.userRoleForClient.findFirst({
      where: {
        userId: adminUser.id,
        clientId: created.body.id,
        role: UserRole.ADMIN,
      },
    });

    expect(role).not.toBeNull();
  });

  it('invites and removes members with admin access', async () => {
    const admin = await createUser();
    const member = await createUser();
    const client = await createClient();

    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const invite = await request(app)
      .post(`/api/clients/${client.id}/inviteMember`)
      .set('x-test-user-id', admin.id)
      .send({ email: member.email, role: UserRole.USER });

    expect(invite.status).toBe(201);

    const role = await prisma.userRoleForClient.findFirst({
      where: {
        userId: member.id,
        clientId: client.id,
        role: UserRole.USER,
      },
    });
    expect(role).not.toBeNull();

    const remove = await request(app)
      .post(`/api/clients/${client.id}/removeMember`)
      .set('x-test-user-id', admin.id)
      .send({ email: member.email });

    expect(remove.status).toBe(204);
  });

  it('prevents removing the last admin', async () => {
    const admin = await createUser();
    const client = await createClient();

    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const response = await request(app)
      .post(`/api/clients/${client.id}/removeMember`)
      .set('x-test-user-id', admin.id)
      .send({ email: admin.email });

    expect(response.status).toBe(400);
  });

  it('shares and revokes access for a recipient client', async () => {
    const admin = await createUser();
    const recipientMember = await createUser();
    const sharerClient = await createClient({ name: 'Sharer' });
    const recipientClient = await createClient({ name: 'Recipient' });

    await attachUserToClient({
      userId: admin.id,
      clientId: sharerClient.id,
      role: UserRole.ADMIN,
    });
    await attachUserToClient({
      userId: recipientMember.id,
      clientId: recipientClient.id,
      role: UserRole.USER,
    });

    const grant = await request(app)
      .post(`/api/clients/${sharerClient.id}/shareAccess`)
      .set('x-test-user-id', admin.id)
      .send({ recipientId: recipientClient.id });

    expect(grant.status).toBe(201);

    const sharedRole = await prisma.userRoleForClient.findFirst({
      where: {
        userId: recipientMember.id,
        clientId: sharerClient.id,
        role: UserRole.SHARED_ACCESS,
      },
    });

    expect(sharedRole).not.toBeNull();

    const revoke = await request(app)
      .post(`/api/clients/${sharerClient.id}/revokeAccess`)
      .set('x-test-user-id', admin.id)
      .send({ revokedId: recipientClient.id });

    expect(revoke.status).toBe(204);
  });
});
