// Description: This service calculates monthly analytics for a user, including total owed, lent, and settled amounts.
import { prisma } from "../lib/prisma";

export const getMonthlyAnalytics = async (userId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    // Get individual balances where user owes money (positive amounts) for this month
    const individualOwed = await prisma.balance.aggregate({
      _sum: { amount: true },
      where: {
        userId: userId,
        amount: { gt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth }
      },
    });

    // Get individual balances where user is owed money (negative amounts) for this month
    const individualLent = await prisma.balance.aggregate({
      _sum: { amount: true },
      where: {
        userId: userId,
        amount: { lt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth }
      },
    });

    // Get group balances where user owes money (positive amounts) for this month
    const groupOwed = await prisma.groupBalance.aggregate({
      _sum: { amount: true },
      where: {
        userId: userId,
        amount: { gt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth }
      },
    });

    // Get group balances where user is owed money (negative amounts) for this month
    const groupLent = await prisma.groupBalance.aggregate({
      _sum: { amount: true },
      where: {
        userId: userId,
        amount: { lt: 0 },
        updatedAt: { gte: startOfMonth, lte: endOfMonth }
      },
    });

    // Calculate total owed (positive balances)
    const totalOwed = (individualOwed._sum?.amount || 0) + (groupOwed._sum?.amount || 0);
    const owed = totalOwed.toFixed(2);

    // Calculate total lent (negative balances)
    const totalLent = Math.abs((individualLent._sum?.amount || 0) + (groupLent._sum?.amount || 0));
    const lent = totalLent.toFixed(2);

    // Get settlements for this month
    const settledThisMonthResult = await prisma.settlementItem.aggregate({
      _sum: { amount: true },
      where: {
        OR: [{ userId: userId }, { friendId: userId }],
        settlementTransaction: {
          status: "COMPLETED",
          completedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      },
    });

    const settled = settledThisMonthResult._sum?.amount
      ? settledThisMonthResult._sum.amount.toFixed(2)
      : "0.00";

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
