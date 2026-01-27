import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from 'utils/webhook';
import {
  EventHeader,
  EventHeaderSchema,
  EventType,
} from 'utils/validation/github';

import handlePushEvent from './handlePushEvent';
import handleInstallationEvent from './handleInstallationEvent';
import handleInstallationRepositoriesEvent from './handleInstallationRepositoriesEvent';
import handlePullRequestEvent from './handlePullRequestEvent';
import handleRelease from './handleRelease';

const router = Router();

type EventHandler = (_: any) => Promise<void>;
const eventHandlers: Record<EventType, EventHandler> = {
  push: handlePushEvent,
  installation: handleInstallationEvent,
  installation_repositories: handleInstallationRepositoriesEvent,
  pull_request: handlePullRequestEvent,
  release: handleRelease,
};

/**
 * Handles GitHub App installation events
 * Note: This route expects raw body (handled by middleware in app.ts)
 */
router.post('/', async (req: Request, res: Response) => {
  const handlers: Record<string, EventHandler | undefined> = eventHandlers;
  try {
    const headers = EventHeaderSchema.parse(req.headers) as EventHeader;
    const signature = headers['x-hub-signature-256'];
    const payload = req.body as Buffer;

    if (!verifyWebhookSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload_data = JSON.parse(payload.toString());
    const eventType = headers['x-github-event'];

    console.log(`Received GitHub webhook: ${eventType}`);

    const handler = handlers[eventType];

    if (handler != null) {
      await handler(payload_data);
    } else {
      console.warn(`Got event "${eventType}" without implemented handler.`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
