import crypto from 'crypto';

export function signGithubPayload(payload: Buffer | string, secret: string) {
  const body = typeof payload === 'string' ? Buffer.from(payload) : payload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return `sha256=${signature}`;
}
