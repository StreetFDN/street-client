// docs/schemas/user.ts
import { z } from 'zod';
import { registry } from '../registry';

const UserRoleSchema = z.enum(['SHARED_ACCESS', 'USER', 'ADMIN']);

const UserAccessSchema = z.object({
  accessId: z.string(),
  clientId: z.string(),
  role: UserRoleSchema,
});

export const AuthenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  isSuperUser: z.boolean(),
  accesses: z.array(UserAccessSchema),
});

registry.register('UserAccess', UserAccessSchema);
registry.register('AuthenticatedUser', AuthenticatedUserSchema);
