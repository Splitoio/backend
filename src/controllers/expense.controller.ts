import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export const updateExpenseAcceptedTokens = async (
  req: Request,
  res: Response
) => {
  try {
    const { expenseId } = req.params;

    const schema = z.object({
      acceptedTokenIds: z
        .array(z.string())
        .min(1, "At least one token must be specified"),
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { acceptedTokenIds } = result.data;
    const userId = req.user!.id;

    // Verify user is the expense creator or payer
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        paidBy: true,
        addedBy: true,
        acceptedTokenIds: true,
      },
    });

    if (!expense) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    if (expense.paidBy !== userId && expense.addedBy !== userId) {
      res
        .status(403)
        .json({ error: "You are not authorized to update this expense" });
      return;
    }

    // Verify the tokens exist
    const tokens = await prisma.token.findMany({
      where: {
        id: {
          in: acceptedTokenIds,
        },
      },
    });

    if (tokens.length !== acceptedTokenIds.length) {
      res.status(400).json({ error: "One or more token IDs are invalid" });
      return;
    }

    // Update the expense using raw SQL to handle the array
    const tokensArray = JSON.stringify(acceptedTokenIds);

    await prisma.$executeRaw`
      UPDATE "Expense"
      SET "acceptedTokenIds" = ${tokensArray}::text[], "updatedBy" = ${userId}, "updatedAt" = NOW()
      WHERE "id" = ${expenseId}
    `;

    // Get the updated expense
    const updatedExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    res.json(updatedExpense);
  } catch (error) {
    console.error("Update expense accepted tokens error:", error);
    res.status(500).json({ error: "Failed to update expense accepted tokens" });
  }
};
