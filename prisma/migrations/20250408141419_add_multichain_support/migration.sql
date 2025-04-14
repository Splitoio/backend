/*
  Warnings:

  - You are about to drop the column `originalAmount` on the `SettlementItem` table. All the data in the column will be lost.
  - You are about to drop the column `originalCurrency` on the `SettlementItem` table. All the data in the column will be lost.
  - You are about to drop the column `xlmAmount` on the `SettlementItem` table. All the data in the column will be lost.
  - Added the required column `amount` to the `SettlementItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `SettlementItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chainId` to the `SettlementTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SettlementItem" DROP CONSTRAINT "SettlementItem_friendId_fkey";

-- DropForeignKey
ALTER TABLE "SettlementItem" DROP CONSTRAINT "SettlementItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "SettlementTransaction" DROP CONSTRAINT "SettlementTransaction_groupId_fkey";

-- AlterTable
ALTER TABLE "SettlementItem" DROP COLUMN "originalAmount",
DROP COLUMN "originalCurrency",
DROP COLUMN "xlmAmount",
ADD COLUMN     "afterSettlementBalance" DOUBLE PRECISION,
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "SettlementTransaction" ADD COLUMN     "chainId" TEXT NOT NULL,
ADD COLUMN     "tokenId" TEXT;

-- CreateTable
CREATE TABLE "ChainAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChainAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportedChain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "rpcUrl" TEXT NOT NULL,
    "blockExplorer" TEXT NOT NULL,
    "testnet" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportedChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "contractAddress" TEXT,
    "logoUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangeRateSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChainAccount_userId_idx" ON "ChainAccount"("userId");

-- CreateIndex
CREATE INDEX "ChainAccount_chainId_idx" ON "ChainAccount"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "ChainAccount_userId_chainId_address_key" ON "ChainAccount"("userId", "chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "Token_chainId_symbol_key" ON "Token"("chainId", "symbol");

-- AddForeignKey
ALTER TABLE "ChainAccount" ADD CONSTRAINT "ChainAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChainAccount" ADD CONSTRAINT "ChainAccount_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "SupportedChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "SupportedChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementTransaction" ADD CONSTRAINT "SettlementTransaction_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementTransaction" ADD CONSTRAINT "SettlementTransaction_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "SupportedChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementItem" ADD CONSTRAINT "SettlementItem_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
