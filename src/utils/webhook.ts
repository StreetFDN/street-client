import crypto from 'crypto';
import { config } from '../config';

/**
 * Verifies GitHub webhook signature using HMAC SHA256
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string | undefined): boolean {
  if (!config.github.webhookSecret) {
    console.warn('GITHUB_APP_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }

  if (!signature) {
    return false;
  }

  // GitHub sends signature as "sha256=<hex>"
  const expectedSignature = signature.replace(/^sha256=/, '');
  
  const hmac = crypto.createHmac('sha256', config.github.webhookSecret);
  const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
  const calculatedSignature = hmac.update(payloadBuffer).digest('hex');

  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  );
}
