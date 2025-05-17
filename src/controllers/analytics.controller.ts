import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { createLogger } from "../utils/logger";
import { Prisma, ExpenseParticipant } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const logger = createLogger("analytics-controller");

export const getAnalyticsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    logger.debug({ userId }, "Getting analytics data for user");

    // Get start and end of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Get all expenses where user is involved
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { paidBy: userId }, // User paid
          {
            expenseParticipants: {
              some: {
                userId: userId
              }
            }
          }
        ],
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        expenseParticipants: true,
        paidByUser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    let totalOwed = new Decimal(0);
    let totalLent = new Decimal(0);

    expenses.forEach((expense) => {
      const userParticipant = expense.expenseParticipants.find(
        participant => participant.userId === userId
      );
      
      if (expense.paidBy === userId) {
        // User paid for the expense
        const totalAmount = expense.expenseParticipants.reduce(
          (sum: Decimal, participant: ExpenseParticipant) => 
            sum.plus(new Decimal(participant.amount.toString())), 
          new Decimal(0)
        );
        const userAmount = userParticipant ? new Decimal(userParticipant.amount.toString()) : new Decimal(0);
        totalLent = totalLent.plus(totalAmount.minus(userAmount)); // Amount lent to others
      } else if (userParticipant) {
        // Someone else paid, and user was part of the split
        totalOwed = totalOwed.plus(new Decimal(userParticipant.amount.toString()));
      }
    });

    // Get settlements made by user this month
    const settlements = await prisma.settlementItem.findMany({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId }
        ],
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    let totalSettled = new Decimal(0);
    settlements.forEach((settlement) => {
      if (settlement.userId === userId) {
        totalSettled = totalSettled.plus(new Decimal(settlement.amount.toString()));
      }
    });

    logger.info(
      { userId, totalOwed, totalLent, totalSettled },
      "Successfully retrieved analytics data"
    );

    res.status(200).json({
      owed: `$${totalOwed.toFixed(2)} USD`,
      lent: `$${totalLent.toFixed(2)} USD`,
      settled: `$${totalSettled.toFixed(2)} USD`
    });
  } catch (error) {
    logger.error({ error, userId: req.user?.id }, "Failed to get analytics data");
    res.status(500).json({ error: "Failed to get analytics data" });
  }
};
