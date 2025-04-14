-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('FIAT', 'TOKEN');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "chainId" TEXT,
ADD COLUMN     "currencyType" "CurrencyType" NOT NULL DEFAULT 'FIAT',
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "timeLockIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenId" TEXT;

-- CreateTable
CREATE TABLE "FiatCurrency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiatCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrencyId" TEXT NOT NULL,
    "quoteCurrencyId" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrencyId_idx" ON "ExchangeRate"("baseCurrencyId");

-- CreateIndex
CREATE INDEX "ExchangeRate_quoteCurrencyId_idx" ON "ExchangeRate"("quoteCurrencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrencyId_quoteCurrencyId_key" ON "ExchangeRate"("baseCurrencyId", "quoteCurrencyId");

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_baseCurrencyId_fkey" FOREIGN KEY ("baseCurrencyId") REFERENCES "FiatCurrency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_quoteCurrencyId_fkey" FOREIGN KEY ("quoteCurrencyId") REFERENCES "FiatCurrency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
