/*
  Warnings:

  - You are about to drop the `ExchangeRate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `coinGeckoId` to the `FiatCurrency` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExchangeRate" DROP CONSTRAINT "ExchangeRate_baseCurrencyId_fkey";

-- DropForeignKey
ALTER TABLE "ExchangeRate" DROP CONSTRAINT "ExchangeRate_quoteCurrencyId_fkey";

-- AlterTable
ALTER TABLE "FiatCurrency" ADD COLUMN     "coinGeckoId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ExchangeRate";
