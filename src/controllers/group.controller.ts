import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { nanoid } from "nanoid";
import { createGroupExpense, editExpense } from "../services/split.service";
import { SplitType } from "@prisma/client";
import contactManager from "../contracts/utils";
import { z } from "zod";

export const createGroup = async (req: Request, res: Response) => {
  try {
    const groupSchema = z.object({
      name: z.string().min(1, "Group name is required"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      currency: z.string().default("USD"),
    });

    const result = groupSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { name, currency } = result.data;

    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // if (!user.stellarAccount) {
    //   res.status(401).json({ error: "User has no stellar account" });
    //   return;
    // }

    const groupId = Math.floor(Math.random() * 1000000000); // 9 digit random int

    // const groupId = await contactManager.createGroup([user.stellarAccount]);

    const userId = req.user!.id;

    const group = await prisma.group.create({
      data: {
        name,
        userId,
        contractGroupId: groupId,
        defaultCurrency: currency,
        groupUsers: {
          create: {
            userId,
          },
        },
      },
    });
    res.json(group);
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

export const getAllGroups = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const groups = await prisma.groupUser.findMany({
      where: {
        userId,
      },
      include: {
        group: {
          include: {
            groupUsers: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
    res.json(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const getAllGroupsWithBalances = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const groups = await prisma.groupUser.findMany({
      where: {
        userId,
      },
      include: {
        group: {
          include: {
            groupBalances: {
              where: { userId },
            },
            expenses: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    const sortedGroupsByLatestExpense = groups.sort((a, b) => {
      const aDate = a.group.expenses[0]?.createdAt ?? new Date(0);
      const bDate = b.group.expenses[0]?.createdAt ?? new Date(0);
      return bDate.getTime() - aDate.getTime();
    });

    const groupsWithBalances = sortedGroupsByLatestExpense.map((g) => {
      const balances: Record<string, number> = {};
      for (const balance of g.group.groupBalances) {
        balances[balance.currency] =
          (balances[balance.currency] ?? 0) + balance.amount;
      }
      return {
        ...g.group,
        balances,
      };
    });

    res.json(groupsWithBalances);
  } catch (error) {
    console.error("Get groups with balances error:", error);
    res.status(500).json({ error: "Failed to fetch groups with balances" });
  }
};

export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  try {
    const group = await prisma.group.findFirst({
      where: {
        contractGroupId: parseInt(groupId),
      },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    await prisma.groupUser.create({
      data: {
        groupId: group.id,
        userId,
      },
    });

    res.json(group);
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({ error: "Failed to join group" });
  }
};

export const addOrEditExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user!.id;
  const {
    paidBy,
    name,
    category,
    amount,
    splitType,
    currency,
    participants,
    fileKey,
    expenseDate,
    expenseId,
  } = req.body;

  try {
    if (expenseId) {
      const expenseParticipant = await prisma.expenseParticipant.findUnique({
        where: {
          expenseId_userId: {
            expenseId,
            userId,
          },
        },
      });

      if (!expenseParticipant) {
        res
          .status(403)
          .json({ error: "You are not a participant of this expense" });
        return;
      }
    }

    const expense = expenseId
      ? await editExpense(
          expenseId,
          paidBy,
          name,
          category,
          amount,
          splitType as SplitType,
          currency,
          participants,
          userId,
          expenseDate ?? new Date(),
          fileKey
        )
      : await createGroupExpense(
          groupId,
          paidBy,
          name,
          category,
          amount,
          splitType as SplitType,
          currency,
          participants,
          userId,
          expenseDate ?? new Date(),
          fileKey
        );

    res.json(expense);
  } catch (error) {
    console.error("Add/Edit expense error:", error);
    res.status(500).json({ error: "Failed to create/edit expense" });
  }
};
