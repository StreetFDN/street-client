import request from 'supertest';
import { createTestApp } from 'tests/utils/app';
import {
  attachTokenToClient,
  attachUserToClient,
  createClient,
  createToken,
  createUser,
} from 'tests/utils/db';
import { UserRole } from '@prisma/client';

jest.mock('services/coingecko', () => ({
  getTokenPrice: jest.fn().mockResolvedValue({
    current_price: 1,
    price_change_24h: 0.1,
    price_change_percentage_24h: 10,
    last_updated: 123,
  }),
  getTokenHistoricalCharts: jest.fn().mockResolvedValue({
    prices: [[1, 1]],
    market_caps: [[1, 2]],
    total_volumes: [[1, 3]],
  }),
  getTokenHoldersCurrent: jest.fn().mockResolvedValue({
    total_holders: 100,
    distribution: {
      top_10: '10%',
      '11_30': '20%',
      '31_50': '30%',
      rest: '40%',
    },
    last_updated: 123,
  }),
  getTokenHoldersCountHistorical: jest.fn().mockResolvedValue({
    holders: [['2026-02-01', 10]],
  }),
  getTokenVolume: jest.fn().mockResolvedValue({
    total_volume: 42,
    period: '24h',
  }),
}));

const app = createTestApp();

describe('token routes', () => {
  it('returns token price data', async () => {
    const response = await request(app).get('/api/token/0xabc/price');
    expect(response.status).toBe(200);
    expect(response.body.data.current_price).toBe(1);
  });

  it('returns token price history', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/price/history')
      .query({ period: '7d' });

    expect(response.status).toBe(200);
    expect(response.body.data.total_volumes).toBeDefined();
  });

  it('returns 400 for invalid price history period', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/price/history')
      .query({ period: 'bad' });

    expect(response.status).toBe(400);
  });

  it('returns token holders data', async () => {
    const response = await request(app).get('/api/token/0xabc/holders');
    expect(response.status).toBe(200);
    expect(response.body.data.total_holders).toBe(100);
  });

  it('returns token holders history', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/holders/history')
      .query({ period: '7d' });

    expect(response.status).toBe(200);
    expect(response.body.data.holders).toHaveLength(1);
  });

  it('returns token volume data', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/volume')
      .query({ period: '24h' });

    expect(response.status).toBe(200);
    expect(response.body.data.total_volume).toBe(42);
  });

  it('returns token volume history', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/volume/history')
      .query({ period: '7d' });

    expect(response.status).toBe(200);
    expect(response.body.data.volume).toBeDefined();
  });

  it('returns 400 for invalid volume period', async () => {
    const response = await request(app)
      .get('/api/token/0xabc/volume')
      .query({ period: 'bad' });

    expect(response.status).toBe(400);
  });
});

describe('token management routes', () => {
  it('lists tracked tokens for a client', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.SHARED_ACCESS,
    });

    const token = await createToken({
      address: '0x0000000000000000000000000000000000000002',
    });
    await attachTokenToClient({ clientId: client.id, tokenId: token.id });

    const response = await request(app)
      .get(`/api/clients/${client.id}/tokens`)
      .set('x-test-user-id', user.id);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('adds and removes token with admin access', async () => {
    const admin = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: admin.id,
      clientId: client.id,
      role: UserRole.ADMIN,
    });

    const address = '0x0000000000000000000000000000000000000003';
    const added = await request(app)
      .post(`/api/clients/${client.id}/token`)
      .set('x-test-user-id', admin.id)
      .send({ address, chainId: '1' });

    expect(added.status).toBe(201);

    const removed = await request(app)
      .delete(`/api/clients/${client.id}/token`)
      .set('x-test-user-id', admin.id)
      .send({ address, chainId: '1' });

    expect(removed.status).toBe(204);
  });

  it('blocks token changes for non-admin users', async () => {
    const user = await createUser();
    const client = await createClient();
    await attachUserToClient({
      userId: user.id,
      clientId: client.id,
      role: UserRole.USER,
    });

    const response = await request(app)
      .post(`/api/clients/${client.id}/token`)
      .set('x-test-user-id', user.id)
      .send({
        address: '0x0000000000000000000000000000000000000004',
        chainId: '1',
      });

    expect(response.status).toBe(403);
  });
});
