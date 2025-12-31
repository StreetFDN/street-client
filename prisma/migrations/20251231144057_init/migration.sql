-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubInstallation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GitHubInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubRepo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repoId" INTEGER NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoSyncRun" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
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
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "author" TEXT,
    "additions" INTEGER,
    "deletions" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepoDailySummary" (
    "id" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "GitHubInstallation_installationId_key" ON "GitHubInstallation"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepo_repoId_key" ON "GitHubRepo"("repoId");

-- CreateIndex
CREATE INDEX "GitHubRepo_clientId_isEnabled_idx" ON "GitHubRepo"("clientId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepo_clientId_owner_name_key" ON "GitHubRepo"("clientId", "owner", "name");

-- CreateIndex
CREATE INDEX "RepoSyncRun_repoId_status_idx" ON "RepoSyncRun"("repoId", "status");

-- CreateIndex
CREATE INDEX "RepoSyncRun_status_runType_idx" ON "RepoSyncRun"("status", "runType");

-- CreateIndex
CREATE INDEX "RepoActivityEvent_repoId_occurredAt_idx" ON "RepoActivityEvent"("repoId", "occurredAt");

-- CreateIndex
CREATE INDEX "RepoActivityEvent_repoId_type_occurredAt_idx" ON "RepoActivityEvent"("repoId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "RepoDailySummary_repoId_date_idx" ON "RepoDailySummary"("repoId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RepoDailySummary_repoId_date_key" ON "RepoDailySummary"("repoId", "date");

-- AddForeignKey
ALTER TABLE "GitHubInstallation" ADD CONSTRAINT "GitHubInstallation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "GitHubInstallation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoSyncRun" ADD CONSTRAINT "RepoSyncRun_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoActivityEvent" ADD CONSTRAINT "RepoActivityEvent_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepoDailySummary" ADD CONSTRAINT "RepoDailySummary_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
