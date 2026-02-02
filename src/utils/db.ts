import { prisma } from 'db';
import {
  UserAccessToClient,
  UserAccessToClientIncludeQuery,
  UserAccessToRepository,
} from 'types/db';
import { Maybe } from 'types/utils';
import { UserRole } from '@prisma/client';

export async function findUserAccessToRepository(
  userId: string,
  repoId: string,
  expectedRole: UserRole,
  clientId?: string,
): Promise<Maybe<UserAccessToRepository>> {
  const repo = await prisma.gitHubRepo.findFirst({
    where: {
      id: repoId,
      ...(clientId != null
        ? { installation: { client: { id: clientId } } }
        : {}),
    },
    include: {
      installation: {
        include: {
          client: true,
        },
      },
    },
  });

  if (repo == null) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
  });

  if (user == null) {
    return null;
  }

  if (user.superUser) {
    return {
      role: UserRole.ADMIN,
      user,
      repo,
    };
  }

  const owningClient = repo.installation.client;
  if (owningClient == null) {
    return null;
  }

  const access = await prisma.userRoleForClient.findFirst({
    where: {
      userId,
      clientId: owningClient.id,
    },
  });

  if (access == null || !validateRole(access.role, expectedRole)) {
    return null;
  }

  return {
    role: access.role,
    user,
    repo,
  };
}

export async function findUserAccessToClient<
  TIncludeQuery extends UserAccessToClientIncludeQuery,
>(
  userId: string,
  clientId: string,
  expectedRole: UserRole,
  includeQuery?: TIncludeQuery,
): Promise<Maybe<UserAccessToClient<TIncludeQuery>>> {
  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
    include: includeQuery?.client,
  });

  if (client == null) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      OR: [
        {
          superUser: true,
        },
        {
          clients: {
            some: {
              client: {
                id: clientId,
              },
            },
          },
        },
      ],
    },
    include: includeQuery?.user,
  });

  if (user == null) {
    return null;
  }

  if (user.superUser) {
    return {
      role: UserRole.ADMIN,
      user,
      client,
    } as UserAccessToClient<TIncludeQuery>;
  }

  const access = await prisma.userRoleForClient.findUnique({
    where: {
      userId_clientId: {
        userId,
        clientId,
      },
    },
  });

  if (access == null || !validateRole(access.role, expectedRole)) {
    return null;
  }

  return {
    role: access.role,
    user,
    client,
  } as UserAccessToClient<TIncludeQuery>;
}

const RoleToValue: Record<UserRole, number> = {
  [UserRole.SHARED_ACCESS]: 0,
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
};

function validateRole(givenRole: UserRole, expectedRole: UserRole) {
  const givenRoleValue = RoleToValue[givenRole];
  const expectedRoleValue = RoleToValue[expectedRole];

  return givenRoleValue >= expectedRoleValue;
}
