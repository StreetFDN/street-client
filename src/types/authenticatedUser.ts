import { prisma } from '../db';
import { Prisma, UserRole } from '@prisma/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { config } from '../config';

export class AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly isSuperUser: boolean;
  readonly accesses: UserAccess[];

  private constructor(
    dbUser: Prisma.UserGetPayload<{ include: { clients: true } }>,
  ) {
    this.id = dbUser.id;
    this.email = dbUser.email;
    this.isSuperUser = dbUser.superUser;
    this.accesses = dbUser.clients.map((access) => ({
      accessId: access.id,
      clientId: access.clientId,
      role: access.role,
    }));
  }

  public static async loadBySupabaseUser(
    user: SupabaseUser,
  ): Promise<AuthenticatedUser> {
    const userDBEntry = await prisma.$transaction(async (tx) => {
      await tx.supabaseAccount.upsert({
        where: { id: user.id },
        create: { id: user.id },
        update: {},
      });

      return tx.user.upsert({
        where: { email: user.email! },
        create: {
          email: user.email!,
          name: user.user_metadata.name,
          superUser: config.admin.superUserEmails.has(user.email!),
          supabaseAccountId: user.id,
        },
        update: {
          supabaseAccountId: user.id,
          superUser: config.admin.superUserEmails.has(user.email!),
        },
        include: {
          clients: true,
        },
      });
    });

    return new AuthenticatedUser(userDBEntry);
  }
}

export type UserAccess = {
  accessId: string;
  clientId: string;
  role: UserRole;
};
