-- CreateTable
CREATE TABLE "ClientWeeklySummary" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "summaryText" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientWeeklySummary_clientId_date_key" ON "ClientWeeklySummary"("clientId", "date");

-- AddForeignKey
ALTER TABLE "ClientWeeklySummary" ADD CONSTRAINT "ClientWeeklySummary_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
