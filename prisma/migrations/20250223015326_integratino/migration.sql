/*
  Warnings:

  - You are about to drop the column `publicId` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `splitwiseGroupId` on the `Group` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contractGroupId]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contractGroupId` to the `Group` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Group_publicId_key";

-- DropIndex
DROP INDEX "Group_splitwiseGroupId_key";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "publicId",
DROP COLUMN "splitwiseGroupId",
ADD COLUMN     "contractGroupId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "stellarAccount" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Group_contractGroupId_key" ON "Group"("contractGroupId");
