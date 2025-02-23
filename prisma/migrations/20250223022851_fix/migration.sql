/*
  Warnings:

  - Changed the type of `contractGroupId` on the `Group` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Group" DROP COLUMN "contractGroupId",
ADD COLUMN     "contractGroupId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Group_contractGroupId_key" ON "Group"("contractGroupId");
