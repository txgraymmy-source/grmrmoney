-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransactionCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "blockNumber" INTEGER,
    "timestamp" DATETIME NOT NULL,
    "categoryId" TEXT,
    "transactionCategoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_transactionCategoryId_fkey" FOREIGN KEY ("transactionCategoryId") REFERENCES "TransactionCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "blockNumber", "categoryId", "createdAt", "description", "fromAddress", "id", "status", "timestamp", "toAddress", "txHash", "type", "updatedAt", "userId") SELECT "amount", "blockNumber", "categoryId", "createdAt", "description", "fromAddress", "id", "status", "timestamp", "toAddress", "txHash", "type", "updatedAt", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_transactionCategoryId_idx" ON "Transaction"("transactionCategoryId");
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TransactionCategory_userId_idx" ON "TransactionCategory"("userId");
