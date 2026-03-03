import { z } from 'zod';

export const PostInstallationBinding = z
  .object({
    clientId: z.uuid(),
    installationId: z.number(),
  })
  .strict();
