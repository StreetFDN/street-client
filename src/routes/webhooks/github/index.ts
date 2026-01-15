import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from 'utils/webhook';
import {EventHeader, EventHeaderSchema, EventType} from "utils/validation/github";

import handlePushEvent from "./handlePushEvent";
import handleInstallationEvent from "./handleInstallationEvent";
import handleInstallationRepositoriesEvent from "./handleInstallationRepositoriesEvent";

const router = Router();

const eventToHandler: Record<EventType, (payload: any) => Promise<void>> = {
  'push': handlePushEvent,
  'installation': handleInstallationEvent,
  'installation_repositories': handleInstallationRepositoriesEvent,
};

/**
 * Handles GitHub App installation events
 * Note: This route expects raw body (handled by middleware in app.ts)
 */
router.post('/', async (req: Request, res: Response) => {
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

    await eventToHandler[eventType](payload_data);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;