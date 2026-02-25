-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "walletAddress" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "description", "id", "name", "updatedAt", "userId", "walletAddress") SELECT "createdAt", "description", "id", "name", "updatedAt", "userId", "walletAddress" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_walletAddress_key" ON "Category"("walletAddress");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
