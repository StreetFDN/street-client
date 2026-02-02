import { z } from 'zod';

export const CreateClientSchema = z
  .object({
    name: z.string().min(3).max(100),
    administratorEmail: z.email(),
  })
  .strict();
