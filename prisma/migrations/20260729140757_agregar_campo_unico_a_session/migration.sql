/*
  Warnings:

  - A unique constraint covering the columns `[hashRefresh]` on the table `Session` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Session_hashRefresh_key" ON "Session"("hashRefresh");
