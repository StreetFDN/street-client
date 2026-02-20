import express from 'express';
import request from 'supertest';
import webhookRoutes from 'routes/webhooks/github';
import { signGithubPayload } from 'tests/utils/webhook';

const handlePushEvent = jest.fn();
const handleInstallationEvent = jest.fn();
const handleInstallationRepositoriesEvent = jest.fn();
const handlePullRequestEvent = jest.fn();
const handleRelease = jest.fn();

jest.mock('routes/webhooks/github/handlePushEvent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => handlePushEvent(...args),
}));

jest.mock('routes/webhooks/github/handleInstallationEvent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => handleInstallationEvent(...args),
}));

jest.mock('routes/webhooks/github/handleInstallationRepositoriesEvent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => handleInstallationRepositoriesEvent(...args),
}));

jest.mock('routes/webhooks/github/handlePullRequestEvent', () => ({
  __esModule: true,
  default: (...args: unknown[]) => handlePullRequestEvent(...args),
}));

jest.mock('routes/webhooks/github/handleRelease', () => ({
  __esModule: true,
  default: (...args: unknown[]) => handleRelease(...args),
}));

function createWebhookApp() {
  const app = express();
  app.use(express.raw({ type: 'application/json' }));
  app.use('/webhooks/github', webhookRoutes);
  return app;
}

const secret = process.env.GITHUB_APP_WEBHOOK_SECRET ?? 'test';

const pushPayload = {
  repository: { id: 1 },
  installation: { id: 999 },
  compare: 'https://github.com/org/repo/compare/1...2',
  commits: [
    {
      id: 'abc',
      message: 'feat: add feature',
      timestamp: '2026-02-01T12:00:00Z',
      url: 'https://github.com/org/repo/commit/abc',
      author: { username: 'octo' },
      distinct: true,
    },
  ],
};

describe('github webhook routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts valid push payload and calls handler', async () => {
    const app = createWebhookApp();
    const body = JSON.stringify(pushPayload);
    const signature = signGithubPayload(body, secret);

    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(body);

    expect(response.status).toBe(200);
    expect(handlePushEvent).toHaveBeenCalledWith(pushPayload);
  });

  it('rejects invalid signature', async () => {
    const app = createWebhookApp();
    const body = JSON.stringify(pushPayload);

    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', 'sha256=invalid')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(response.status).toBe(401);
  });

  it('returns 200 for unknown event type', async () => {
    const app = createWebhookApp();
    const body = JSON.stringify({ hello: 'world' });
    const signature = signGithubPayload(body, secret);

    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'unknown_event')
      .set('x-hub-signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(body);

    expect(response.status).toBe(200);
  });

  it('returns 500 when handler throws', async () => {
    handlePushEvent.mockRejectedValueOnce(new Error('boom'));

    const app = createWebhookApp();
    const body = JSON.stringify(pushPayload);
    const signature = signGithubPayload(body, secret);

    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(body);

    expect(response.status).toBe(500);
  });

  it('routes other event types to handlers', async () => {
    const app = createWebhookApp();
    const events = [
      { name: 'installation', handler: handleInstallationEvent },
      {
        name: 'installation_repositories',
        handler: handleInstallationRepositoriesEvent,
      },
      { name: 'pull_request', handler: handlePullRequestEvent },
      { name: 'release', handler: handleRelease },
    ];

    for (const event of events) {
      const body = JSON.stringify({
        action: 'created',
        installation: { id: 1, account: { login: 'octo' } },
        repository: { id: 1 },
        release: {
          url: 'https://github.com/org/repo/releases/1',
          id: 1,
          author: { login: 'octo' },
          name: 'v1',
          tag_name: 'v1',
          draft: false,
          prerelease: false,
          published_at: '2026-02-01T00:00:00Z',
          created_at: '2026-02-01T00:00:00Z',
          updated_at: '2026-02-01T00:00:00Z',
          body: 'notes',
        },
        pull_request: {
          id: 1,
          number: 1,
          merged_at: null,
          url: 'https://github.com/org/repo/pull/1',
          body: null,
          title: 'Test',
          user: { id: 1, login: 'octo' },
          labels: [],
        },
        repositories_added: [{ id: 1, name: 'repo', private: false }],
      });
      const signature = signGithubPayload(body, secret);

      const response = await request(app)
        .post('/webhooks/github')
        .set('x-github-event', event.name)
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response.status).toBe(200);
      expect(event.handler).toHaveBeenCalled();
    }
  });
});
