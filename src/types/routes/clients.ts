import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const CreateClientSchema = z
  .object({
    name: z.string().min(3).max(100),
    administratorEmail: z.email(),
  })
  .strict();

export const GrantClientAccessSchema = z
  .object({
    recipientId: z.string(),
  })
  .strict();

export const RevokeClientAccessSchema = z
  .object({
    revokedId: z.string(),
  })
  .strict();

export const InviteClientMemberSchema = z
  .object({
    email: z.email(),
    role: z
      .nativeEnum(UserRole)
      .refine((role) => role !== UserRole.SHARED_ACCESS, {
        message: 'role must be USER or ADMIN',
      }),
  })
  .strict();

export const RemoveClientMemberSchema = z
  .object({
    email: z.email(),
  })
  .strict();
