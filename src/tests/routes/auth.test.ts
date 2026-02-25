import request from 'supertest';
import { createTestApp } from 'tests/utils/app';

const app = createTestApp();

describe('auth routes', () => {
  it('returns 401 when unauthenticated', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('returns current user when authenticated', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('x-test-user-id', 'user-123');

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('user-123');
  });
});
