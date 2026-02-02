import { GitHubRepo, Prisma, User, UserRole } from '@prisma/client';

export type UserAccessToRepository = {
  role: UserRole;
  repo: GitHubRepo;
  user: User;
};

export type UserAccessToClientIncludeQuery = {
  user?: Prisma.UserInclude;
  client?: Prisma.ClientInclude;
};

export type UserAccessToClient<
  TInclude extends UserAccessToClientIncludeQuery,
> = {
  role: UserRole;
  user: Prisma.UserGetPayload<{
    include: TInclude['user'] extends Prisma.UserInclude
      ? TInclude['user']
      : Prisma.UserDefaultArgs['include'];
  }>;
  client: Prisma.ClientGetPayload<{
    include: TInclude['client'] extends Prisma.ClientInclude
      ? TInclude['client']
      : Prisma.ClientDefaultArgs['include'];
  }>;
};
