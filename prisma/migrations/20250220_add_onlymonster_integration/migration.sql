-- AlterTable
ALTER TABLE "User" ADD COLUMN "onlyMonsterApiKey" TEXT;

-- AlterTable
ALTER TABLE "Transaction"
  ALTER COLUMN "txHash" DROP NOT NULL,
  ALTER COLUMN "fromAddress" DROP NOT NULL,
  ALTER COLUMN "toAddress" DROP NOT NULL,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'blockchain',
  ADD COLUMN "onlyFansTransactionId" TEXT,
  ADD COLUMN "onlyFansFanId" TEXT,
  ADD COLUMN "onlyFansType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_onlyFansTransactionId_key" ON "Transaction"("onlyFansTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_source_idx" ON "Transaction"("source");

-- CreateTable
CREATE TABLE "OnlyFansAccount" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'onlyfans',
    "username" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "email" TEXT,
    "subscribePrice" DOUBLE PRECISION,
    "organisationId" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlyFansAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnlyFansAccount_categoryId_idx" ON "OnlyFansAccount"("categoryId");

-- CreateIndex
CREATE INDEX "OnlyFansAccount_platformAccountId_idx" ON "OnlyFansAccount"("platformAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "OnlyFansAccount_categoryId_platformAccountId_key" ON "OnlyFansAccount"("categoryId", "platformAccountId");

-- AddForeignKey
ALTER TABLE "OnlyFansAccount" ADD CONSTRAINT "OnlyFansAccount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
