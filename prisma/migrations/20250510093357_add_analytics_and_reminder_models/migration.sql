-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('USER', 'SPLIT');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_addedBy_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_deletedBy_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "analyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "reminderFrequency" TEXT,
ADD COLUMN     "reminderPreference" TEXT;

-- CreateTable
CREATE TABLE "UserReminder" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "splitId" TEXT,
    "content" TEXT,
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReminder_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReminder" ADD CONSTRAINT "UserReminder_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReminder" ADD CONSTRAINT "UserReminder_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReminder" ADD CONSTRAINT "UserReminder_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
