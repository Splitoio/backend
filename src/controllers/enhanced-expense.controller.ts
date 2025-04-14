import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { SplitType } from "@prisma/client";
import {
  createEnhancedGroupExpense,
  getExpensesWithConvertedValues,
} from "../services/enhanced-split.service";

/**
 * Create a new expense with support for multiple currency types and time lock-in
 */
export const createEnhancedExpenseController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      groupId,
      paidBy,
      name,
      category,
      amount,
      splitType = SplitType.EQUAL,
      currency,
      currencyType,
      tokenId,
      chainId,
      timeLockIn = false,
      participants,
      expenseDate = new Date(),
      fileKey,
    } = req.body;

    const currentUserId = req.user!.id;

    // Check required fields
    if (
      !groupId ||
      !paidBy ||
      !name ||
      !category ||
      !amount ||
      !currency ||
      !participants
    ) {
      res.status(400).json({
        error: "Missing required fields",
      });
      return;
    }

    // Ensure the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Ensure current user is in the group
    const userInGroup = await prisma.groupUser.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: currentUserId,
        },
      },
    });

    if (!userInGroup) {
      res.status(403).json({ error: "You're not a member of this group" });
      return;
    }

    // Create the expense
    const expense = await createEnhancedGroupExpense({
      groupId,
      paidBy,
      name,
      category,
      amount: parseFloat(amount),
      splitType,
      currency,
      currencyType,
      tokenId,
      chainId,
      timeLockIn,
      participants: participants.map((p: any) => ({
        userId: p.userId,
        amount: parseFloat(p.amount),
      })),
      currentUserId,
      expenseDate: new Date(expenseDate),
      fileKey,
    });

    res.status(201).json({ expense });
  } catch (error) {
    console.error("Failed to create enhanced expense:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to create expense",
    });
  }
};

/**
 * Get expenses with converted values based on time lock-in
 */
export const getEnhancedExpensesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { groupId } = req.params;
    const { targetCurrency = "USD" } = req.query;

    if (!groupId) {
      res.status(400).json({ error: "Group ID is required" });
      return;
    }

    // Ensure the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Get expenses with converted values
    const expenses = await getExpensesWithConvertedValues(
      groupId,
      targetCurrency as string
    );

    res.status(200).json({ expenses });
  } catch (error) {
    console.error("Failed to get enhanced expenses:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get expenses",
    });
  }
};
