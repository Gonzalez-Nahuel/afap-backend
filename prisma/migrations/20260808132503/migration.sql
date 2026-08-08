/*
  Warnings:

  - You are about to drop the column `hashRefresh` on the `Session` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refreshTokenHash]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `refreshTokenHash` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_hashRefresh_key";

-- DropIndex
DROP INDEX "Session_userId_hashRefresh_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "hashRefresh",
ADD COLUMN     "refreshTokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_refreshTokenHash_idx" ON "Session"("userId", "refreshTokenHash");
