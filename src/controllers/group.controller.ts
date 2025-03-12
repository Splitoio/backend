import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createGroupExpense,
  editExpense,
  joinGroup as addMemberById,
} from "../services/split.service";
import { SplitType } from "@prisma/client";
import { z } from "zod";
import contactManager from "../contracts/utils";
import { createSplitInfo } from "../contracts/stellarClient";

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

    const { name, currency, description, imageUrl } = result.data;

    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!user.stellarAccount) {
      res.status(400).json({ error: "User has no stellar account" });
      return;
    }

    // const groupId = Math.floor(Math.random() * 1000000000); // 9 digit random int

    const groupId = await contactManager.createGroup([user.stellarAccount]);

    const userId = req.user!.id;

    const group = await prisma.group.create({
      data: {
        name,
        userId,
        description,
        image: imageUrl,
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

  const stellarAccount = req.user!.stellarAccount;

  if (!stellarAccount) {
    res.json([]);
    return;
  }

  try {
    const groups = await prisma.groupUser.findMany({
      where: {
        userId,
      },
      include: {
        group: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            // groupUsers: {
            //   include: {
            //     user: true,
            //   },
            // },
          },
        },
      },
    });
    const groupsData = groups.map((group) => group.group);
    res.json(groupsData);
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

export const getGroupById = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId as string,
        groupUsers: {
          some: {
            userId,
          },
        },
      },
      include: {
        groupUsers: {
          include: {
            user: true,
          },
        },
        expenses: true,
        groupBalances: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const members = group.groupUsers.map((user) => user.user);

    const balances = await Promise.all(
      members.map(async (member) => {
        const balance = await contactManager.getGroupMemberBalances(
          group.contractGroupId,
          member.stellarAccount ?? ""
        );
        return {
          ...member,
          balance,
        };
      })
    );

    console.log("balances", balances);
    res.json({
      ...group,
      balances,
    });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Failed to fetch group" });
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
        id: groupId,
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

export const addExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { groupId } = req.params;

  const { amount, members, shares, description } = req.body;

  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        contractGroupId: true,
      },
    });

    const contractGroupId = group?.contractGroupId;
    const payer = req.user!.stellarAccount!;

    if (!contractGroupId) {
      res.status(400).json({ error: "Group has no contract group id" });
      return;
    }

    const splitInfo = createSplitInfo(members, shares);

    const expense = await contactManager.addExpense(
      contractGroupId,
      amount,
      splitInfo,
      description,
      payer
    );

    res.json(expense);
  } catch (error) {
    console.error("Add/Edit expense error:", error);
    res.status(500).json({ error: "Failed to create/edit expense" });
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

export const addMemberToGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { memberIdentifier, groupId } = req.body;
  const userStellarAccount = req.user!.stellarAccount!;

  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        contractGroupId: true,
      },
    });

    if (!group) {
      res.status(404).json({ message: "Group not found", status: "error" });
      return;
    }

    const contractGroupId = group.contractGroupId;

    const member = await prisma.user.findFirst({
      where: {
        OR: [{ email: memberIdentifier }, { name: memberIdentifier }],
      },
    });

    if (!member) {
      res.status(404).json({ message: "User not found", status: "error" });
      return;
    }

    if (!member.stellarAccount) {
      res
        .status(400)
        .json({ message: "User has no stellar account", status: "error" });
      return;
    }

    const members: string[] = await contactManager.getGroupMembers(
      contractGroupId
    );

    if (!members.includes(userStellarAccount)) {
      res.status(400).json({
        message: "You are not a member of this group",
        status: "error",
      });
      return;
    }

    if (members.includes(member.stellarAccount)) {
      res.status(400).json({
        message: "User is already a member of this group",
        status: "error",
      });
      return;
    }

    await contactManager.addMemberToGroup(
      contractGroupId,
      member.stellarAccount
    );

    await addMemberById(member.id, groupId);

    res.json({
      success: true,
      message: "Added to group successfully",
    });
  } catch (error) {
    console.error("Unable to add member to group:", error);
    res.status(500).json({ error: "Failed to add member to group" });
  }
};

export const getGroupExpenses = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      contractGroupId: true,
    },
  });

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const contractGroupId = group.contractGroupId;
  const expenses = await contactManager.getGroupExpenses(contractGroupId);
  res.json(expenses);
};
