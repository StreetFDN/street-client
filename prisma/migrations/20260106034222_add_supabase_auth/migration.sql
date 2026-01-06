-- AlterTable: Make githubId nullable
ALTER TABLE "User" ALTER COLUMN "githubId" DROP NOT NULL;

-- AlterTable: Make githubLogin nullable
ALTER TABLE "User" ALTER COLUMN "githubLogin" DROP NOT NULL;

-- AlterTable: Add supabaseId column
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;

-- CreateIndex: Add unique constraint on supabaseId
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex: Add unique constraint on email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
