-- CreateTable
CREATE TABLE "XAccount" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "profileUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XAccountSnapshot" (
    "id" UUID NOT NULL,
    "xAccountId" UUID NOT NULL,
    "followers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XAccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPostSnapshot" (
    "id" UUID NOT NULL,
    "xAccountId" UUID NOT NULL,
    "postId" TEXT NOT NULL,
    "postCreatedAt" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL,
    "reposts" INTEGER NOT NULL,
    "replies" INTEGER NOT NULL,
    "impressions" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPostSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XAccount_userId_idx" ON "XAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "XAccount_clientId_key" ON "XAccount"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "XAccount_userId_key" ON "XAccount"("userId");

-- CreateIndex
CREATE INDEX "XAccountSnapshot_xAccountId_createdAt_idx" ON "XAccountSnapshot"("xAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "XPostSnapshot_xAccountId_createdAt_idx" ON "XPostSnapshot"("xAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "XPostSnapshot_postId_idx" ON "XPostSnapshot"("postId");

-- AddForeignKey
ALTER TABLE "XAccount" ADD CONSTRAINT "XAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XAccountSnapshot" ADD CONSTRAINT "XAccountSnapshot_xAccountId_fkey" FOREIGN KEY ("xAccountId") REFERENCES "XAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPostSnapshot" ADD CONSTRAINT "XPostSnapshot_xAccountId_fkey" FOREIGN KEY ("xAccountId") REFERENCES "XAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
