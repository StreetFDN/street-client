/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `XAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "XAccount_username_key" ON "XAccount"("username");
