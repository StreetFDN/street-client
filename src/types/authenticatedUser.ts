import { prisma } from '../db';
import { Prisma, UserRole } from '@prisma/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { config } from '../config';
import { Maybe } from './utils';

export class AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly isSuperUser: boolean;
  readonly accesses: UserAccess[];

  private constructor(
    dbUser: Prisma.UserGetPayload<{
      include: { clients: { include: { client: true } } };
    }>,
  ) {
    this.id = dbUser.id;
    this.email = dbUser.email;
    this.isSuperUser = dbUser.superUser;
    this.accesses = dbUser.clients.map((access) => ({
      accessId: access.id,
      clientId: access.clientId,
      clientName: access.client.name,
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

      const githubIdentity = user.identities?.find(
        (identity) => identity.provider === 'github',
      );
      let maybeGithubAccount: Maybe<
        Prisma.GithubAccountGetPayload<{ include: { user: true } }>
      > = null;
      if (githubIdentity != null && githubIdentity.identity_data != null) {
        const githubId = Number(
          githubIdentity.identity_data.provider_id as string,
        );
        const login = githubIdentity.identity_data.user_name as string;

        maybeGithubAccount = await prisma.githubAccount.upsert({
          where: {
            githubId,
          },
          create: {
            githubId,
            login,
          },
          update: {},
          include: {
            user: true,
          },
        });

        const maybeAssociatedSupabaseId =
          maybeGithubAccount?.user?.supabaseAccountId;
        if (
          maybeAssociatedSupabaseId != null &&
          maybeAssociatedSupabaseId !== user.id
        ) {
          console.log('One github account already associated with user');
          maybeGithubAccount = null;
        }
      }

      const connectGithubAccountQuery = maybeGithubAccount
        ? {
            githubAccountId: maybeGithubAccount.id,
          }
        : {};

      return tx.user.upsert({
        where: { email: user.email! },
        create: {
          email: user.email!,
          name: user.user_metadata?.name ?? user.email!,
          superUser: config.admin.superUserEmails.has(user.email!),
          supabaseAccountId: user.id,
          ...connectGithubAccountQuery,
        },
        update: {
          supabaseAccountId: user.id,
          ...connectGithubAccountQuery,
        },
        include: {
          clients: {
            include: {
              client: true,
            },
          },
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
