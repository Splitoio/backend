/*
  Warnings:

  - A unique constraint covering the columns `[contractGroupId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contractGroupId` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "contractGroupId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Group_contractGroupId_key" ON "Group"("contractGroupId");
