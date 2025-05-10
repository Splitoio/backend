// Description: This service calculates monthly analytics for a user, including total owed, lent, and settled amounts.
import { prisma } from "../lib/prisma";

export const getMonthlyAnalytics = async (userId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    const owedThisMonthResult = await prisma.balance.aggregate({
      _sum: { amount: true },
      where: {
        userId: userId,
        amount: { lt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const lentThisMonthResult = await prisma.balance.aggregate({
      _sum: { amount: true },
      where: {
        friendId: userId,
        amount: { gt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const settledThisMonthResult = await prisma.settlementItem.aggregate({
      _sum: { originalAmount: true },
      where: {
        OR: [{ userId: userId }, { friendId: userId }],
        settlementTransaction: {
          status: "COMPLETED",
          completedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      },
    });

    const owed = owedThisMonthResult._sum.amount
      ? Math.abs(owedThisMonthResult._sum.amount).toFixed(2)
      : "0.00";
    const lent = lentThisMonthResult._sum.amount
      ? lentThisMonthResult._sum.amount.toFixed(2)
      : "0.00";
    const settled = settledThisMonthResult._sum.originalAmount
      ? settledThisMonthResult._sum.originalAmount.toFixed(2)
      : "0.00"; // Use originalAmount or xlmAmount

    return {
      owed: `$${owed} USD`,
      lent: `$${lent} USD`,
      settled: `$${settled} USD`,
    };
  } catch (error) {
    console.error("Error calculating monthly analytics:", error);
    throw new Error("Failed to calculate monthly analytics");
  }
};
