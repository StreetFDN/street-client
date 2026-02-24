import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import { createUser } from 'tests/utils/db';

const app = createTestApp();

describe('Admin Routes', () => {
  it('Non-Superusers get an unauthorized status', async () => {
    const user = await createUser();
    const response = await request(app)
      .get('/api/admin/authorization')
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(403);
  });

  it('Superusers are authorized', async () => {
    const superuser = await createUser({
      superUser: true,
    });
    const response = await request(app)
      .get('/api/admin/authorization')
      .set('x-test-user-id', superuser.id)
      .set('x-is-superuser', 'true');

    expect(response.status).toBe(200);
  });
});
