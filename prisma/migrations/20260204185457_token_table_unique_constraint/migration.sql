/*
  Warnings:

  - A unique constraint covering the columns `[tokenId]` on the table `ClientTokens` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chainId` to the `Token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Token" ADD COLUMN     "chainId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ClientTokens_tokenId_key" ON "ClientTokens"("tokenId");

-- CreateIndex
CREATE INDEX "Token_address_chainId_idx" ON "Token"("address", "chainId");
