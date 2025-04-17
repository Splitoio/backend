-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "acceptedTokenIds" TEXT[];

-- CreateTable
CREATE TABLE "UserAcceptedToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAcceptedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupAcceptedToken" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupAcceptedToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAcceptedToken_userId_idx" ON "UserAcceptedToken"("userId");

-- CreateIndex
CREATE INDEX "UserAcceptedToken_tokenId_idx" ON "UserAcceptedToken"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAcceptedToken_userId_tokenId_chainId_key" ON "UserAcceptedToken"("userId", "tokenId", "chainId");

-- CreateIndex
CREATE INDEX "GroupAcceptedToken_groupId_idx" ON "GroupAcceptedToken"("groupId");

-- CreateIndex
CREATE INDEX "GroupAcceptedToken_tokenId_idx" ON "GroupAcceptedToken"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupAcceptedToken_groupId_tokenId_chainId_key" ON "GroupAcceptedToken"("groupId", "tokenId", "chainId");

-- AddForeignKey
ALTER TABLE "UserAcceptedToken" ADD CONSTRAINT "UserAcceptedToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAcceptedToken" ADD CONSTRAINT "UserAcceptedToken_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAcceptedToken" ADD CONSTRAINT "UserAcceptedToken_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "SupportedChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAcceptedToken" ADD CONSTRAINT "GroupAcceptedToken_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAcceptedToken" ADD CONSTRAINT "GroupAcceptedToken_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupAcceptedToken" ADD CONSTRAINT "GroupAcceptedToken_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "SupportedChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
