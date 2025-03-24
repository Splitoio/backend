/*
  Warnings:

  - You are about to drop the column `contractGroupId` on the `Group` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Group_contractGroupId_key";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "contractGroupId";
