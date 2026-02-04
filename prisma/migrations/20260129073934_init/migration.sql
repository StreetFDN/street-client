-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SHARED_ACCESS', 'USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "superUser" BOOLEAN NOT NULL DEFAULT false,
    "githubAccountId" UUID,
    "supabaseAccountId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubAccount" (
    "id" UUID NOT NULL,
    "githubId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,

    CONSTRAINT "GithubAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupabaseAccount" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupabaseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleForClient" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "sharedAccessId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleForClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "githubInstallationId" UUID,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedClientAccess" (
    "id" UUID NOT NULL,
    "sharerId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedClientAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubInstallation" (
    "id" UUID NOT NULL,
    "githubId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "creatorId" UUID NOT NULL,

    CONSTRAINT "GitHubInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubRepo" (
    "id" UUID NOT NULL,
    "installationId" UUID NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoSyncRun" (
    "id" UUID NOT NULL,
    "repoId" UUID NOT NULL,
    "runType" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoActivityEvent" (
    "id" UUID NOT NULL,
    "githubId" TEXT NOT NULL,
    "repoId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT,
    "additions" INTEGER,
    "deletions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoDailySummary" (
    "id" UUID NOT NULL,
    "repoId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "summaryText" TEXT NOT NULL,
    "stats" JSONB,
    "noChanges" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoDailySummary_pkey" PRIMARY KEY ("id")
);

-- Manually added partial indexes for ClientRole table
-- Index for direct roles
CREATE UNIQUE INDEX "UserRoleForClientForClient_userId_clientId_noSharedAccessId_key"
    ON "UserRoleForClient" ("userId", "clientId")
    WHERE "sharedAccessId" IS NULL;

-- Index for shared access
CREATE UNIQUE INDEX "UserRoleForClientForClient_userId_clientId_sharedAccessId_key"
    ON "UserRoleForClient" ("userId", "clientId")
    WHERE "sharedAccessId" IS NOT NULL;


-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubAccountId_key" ON "User"("githubAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAccountId_key" ON "User"("supabaseAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_githubId_key" ON "GithubAccount"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "GithubAccount_login_key" ON "GithubAccount"("login");

-- CreateIndex
CREATE INDEX "GithubAccount_login_idx" ON "GithubAccount"("login");

-- CreateIndex
CREATE INDEX "UserRoleForClient_userId_clientId_idx" ON "UserRoleForClient"("userId", "clientId");

-- CreateIndex
CREATE INDEX "UserRoleForClient_clientId_idx" ON "UserRoleForClient"("clientId");

-- CreateIndex
CREATE INDEX "UserRoleForClient_sharedAccessId_idx" ON "UserRoleForClient"("sharedAccessId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Client_githubInstallationId_key" ON "Client"("githubInstallationId");

-- CreateIndex
CREATE INDEX "Client_githubInstallationId_idx" ON "Client"("githubInstallationId");

-- CreateIndex
CREATE INDEX "SharedClientAccess_recipientId_idx" ON "SharedClientAccess"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedClientAccess_sharerId_recipientId_key" ON "SharedClientAccess"("sharerId", "recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_githubId_key" ON "GitHubInstallation"("githubId");

-- CreateIndex
CREATE INDEX "GitHubInstallation_githubId_idx" ON "GitHubInstallation"("githubId");

-- CreateIndex
CREATE INDEX "GitHubInstallation_creatorId_idx" ON "GitHubInstallation"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepo_githubId_key" ON "GitHubRepo"("githubId");

-- CreateIndex
CREATE INDEX "GitHubRepo_installationId_idx" ON "GitHubRepo"("installationId");

-- CreateIndex
CREATE INDEX "RepoSyncRun_status_idx" ON "RepoSyncRun"("status");

-- CreateIndex
CREATE INDEX "RepoActivityEvent_repoId_occurredAt_idx" ON "RepoActivityEvent"("repoId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RepoActivityEvent_repoId_type_githubId_key" ON "RepoActivityEvent"("repoId", "type", "githubId");

-- CreateIndex
CREATE UNIQUE INDEX "RepoDailySummary_repoId_date_key" ON "RepoDailySummary"("repoId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_githubAccountId_fkey" FOREIGN KEY ("githubAccountId") REFERENCES "GithubAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supabaseAccountId_fkey" FOREIGN KEY ("supabaseAccountId") REFERENCES "SupabaseAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleForClient" ADD CONSTRAINT "UserRoleForClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleForClient" ADD CONSTRAINT "UserRoleForClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleForClient" ADD CONSTRAINT "UserRoleForClient_sharedAccessId_fkey" FOREIGN KEY ("sharedAccessId") REFERENCES "SharedClientAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_githubInstallationId_fkey" FOREIGN KEY ("githubInstallationId") REFERENCES "GitHubInstallation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedClientAccess" ADD CONSTRAINT "SharedClientAccess_sharerId_fkey" FOREIGN KEY ("sharerId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedClientAccess" ADD CONSTRAINT "SharedClientAccess_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "GithubAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "GitHubInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoSyncRun" ADD CONSTRAINT "RepoSyncRun_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoActivityEvent" ADD CONSTRAINT "RepoActivityEvent_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoDailySummary" ADD CONSTRAINT "RepoDailySummary_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
