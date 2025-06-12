import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  createGroupExpense,
  editExpense,
  joinGroup as addMemberById,
  createEnhancedGroupExpense,
  getExpensesWithConvertedValues,
  updateGroupBalanceForParticipants,
} from "../services/split.service";
import { SplitType, CurrencyType } from "@prisma/client";
import { z } from "zod";

export const createGroup = async (req: Request, res: Response) => {
  try {
    const groupSchema = z.object({
      name: z.string().min(1, "Group name is required"),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      currency: z.string().default("USD"),
      acceptedTokens: z
        .array(
          z.object({
            tokenId: z.string(),
            chainId: z.string(),
            isDefault: z.boolean().optional(),
          })
        )
        .optional(),
    });

    const result = groupSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const { name, currency, description, imageUrl, acceptedTokens } =
      result.data;

    const user = req.user;

    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user!.id;

    const group = await prisma.group.create({
      data: {
        name,
        userId,
        description,
        image: imageUrl,
        defaultCurrency: currency,
        groupUsers: {
          create: {
            userId,
          },
        },
      },
    });

    // Add accepted tokens if provided
    if (acceptedTokens && acceptedTokens.length > 0) {
      await Promise.all(
        acceptedTokens.map(async (token, index) => {
          const { tokenId, chainId, isDefault = index === 0 } = token;

          return prisma.groupAcceptedToken.create({
            data: {
              groupId: group.id,
              tokenId,
              chainId,
              isDefault,
            },
          });
        })
      );
    }

    const createdGroupWithRelations = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        createdBy: {
          select: { id: true, name: true }
        },
        groupUsers: {
          include: {
            user: { select: { id: true, name: true } }
          }
        },
        groupBalances: true,
      },
    });

    res.status(201).json(createdGroupWithRelations);
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
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
            groupUsers: {
              include: {
                user: {
                  select: { id: true, name: true }
                },
              },
            },
            groupBalances: true,
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

    res.json(group);
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

// export const joinGroup = async (req: Request, res: Response): Promise<void> => {
//   const { groupId } = req.params;
//   const userId = req.user!.id;

//   try {
//     const group = await prisma.group.findFirst({
//       where: {
//         id: groupId,
//       },
//     });

//     if (!group) {
//       res.status(404).json({ error: "Group not found" });
//       return;
//     }

//     await prisma.groupUser.create({
//       data: {
//         groupId: group.id,
//         userId,
//       },
//     });

//     res.json(group);
//   } catch (error) {
//     console.error("Join group error:", error);
//     res.status(500).json({ error: "Failed to join group" });
//   }
// };

export const addOrEditExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user!.id;
  const {
    // paidBy,
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

  const paidBy = userId;

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

export const addMemberToGroup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { memberIdentifier, groupId } = req.body;
  // const userStellarAccount = req.user!.stellarAccount!;
  const userId = req.user!.id;

  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        groupUsers: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!group) {
      res.status(404).json({ message: "Group not found", status: "error" });
      return;
    }

    // const contractGroupId = group.contractGroupId;

    const member = await prisma.user.findFirst({
      where: {
        OR: [{ email: memberIdentifier }, { name: memberIdentifier }],
      },
    });

    if (!member) {
      res.status(404).json({ message: "User not found", status: "error" });
      return;
    }

    // if (!member.stellarAccount) {
    //   res
    //     .status(400)
    //     .json({ message: "User has no stellar account", status: "error" });
    //   return;
    // }

    const members = group.groupUsers.map((user) => user.userId);

    if (!members.includes(userId)) {
      res.status(400).json({
        message: "You are not a member of this group",
        status: "error",
      });
      return;
    }

    if (members.includes(member.id)) {
      res.status(400).json({
        message: "User is already a member of this group",
        status: "error",
      });
      return;
    }

    await addMemberById(member.id, groupId);

    res.json({
      success: true,
      message: "Added to group successfully",
    });
  } catch (error) {
    console.error("Add/Edit expense error:", error);
    res.status(500).json({ error: "Failed to create/edit expense" });
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  const { groupId } = req.params;
  const userId = req.user!.id;

  try {
    // Find the group with all related data
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        groupBalances: true,
        expenses: true,
        groupUsers: true,
      },
    });

    // Check if group exists
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Check if user is the creator
    if (group.userId !== userId) {
      res.status(403).json({ error: "Only creator can delete the group" });
      return;
    }

    // Check for non-zero balances
    const balanceWithNonZero = group.groupBalances.find((b: any) => b.amount !== 0);
    if (balanceWithNonZero) {
      res.status(400).json({
        error: "Cannot delete group with non-zero balances. Please settle all balances first.",
      });
      return;
    }

    // Check for any expenses (or add your own logic for pending expenses)
    if (group.expenses.length > 0) {
      res.status(400).json({
        error: "Cannot delete group with expenses. Please remove all expenses first.",
      });
      return;
    }

    // Delete all related data in a transaction
    await prisma.$transaction(async (prisma) => {
      await prisma.groupBalance.deleteMany({ where: { groupId } });
      await prisma.groupAcceptedToken.deleteMany({ where: { groupId } });
      await prisma.expense.deleteMany({ where: { groupId } });
      await prisma.groupUser.deleteMany({ where: { groupId } });
      await prisma.group.delete({ where: { id: groupId } });
    });

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete group"
    });
  }
};

export const getGroupAcceptedTokens = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user!.id;

    // Verify user is in the group
    const userInGroup = await prisma.groupUser.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!userInGroup) {
      res.status(403).json({ error: "Not a member of this group" });
      return;
    }

    const acceptedTokens = await prisma.$queryRaw`
      SELECT gt.*, t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
            sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl
      FROM "GroupAcceptedToken" gt
      JOIN "Token" t ON gt."tokenId" = t.id
      JOIN "SupportedChain" sc ON gt."chainId" = sc.id
      WHERE gt."groupId" = ${groupId}
    `;

    res.json(acceptedTokens);
  } catch (error) {
    console.error("Get group accepted tokens error:", error);
    res.status(500).json({ error: "Failed to fetch accepted tokens" });
  }
};

const tokenSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  chainId: z.string().min(1, "Chain ID is required"),
  isDefault: z.boolean().optional(),
});

export const addGroupAcceptedToken = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const result = tokenSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const userId = req.user!.id;
    const { tokenId, chainId, isDefault = false } = result.data;

    // Verify user is in the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.userId !== userId) {
      res
        .status(403)
        .json({ error: "Only group creator can add accepted tokens" });
      return;
    }

    // Check if token exists
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.$executeRaw`
        UPDATE "GroupAcceptedToken" 
        SET "isDefault" = false 
        WHERE "groupId" = ${groupId} AND "isDefault" = true
      `;
    }

    // Check if token acceptance already exists
    const existingToken = await prisma.$queryRaw`
      SELECT * FROM "GroupAcceptedToken" 
      WHERE "groupId" = ${groupId} AND "tokenId" = ${tokenId} AND "chainId" = ${chainId}
    `;

    let acceptedToken;
    if (Array.isArray(existingToken) && existingToken.length > 0) {
      // Update
      acceptedToken = await prisma.$executeRaw`
        UPDATE "GroupAcceptedToken"
        SET "isDefault" = ${isDefault}
        WHERE "groupId" = ${groupId} AND "tokenId" = ${tokenId} AND "chainId" = ${chainId}
        RETURNING *
      `;
    } else {
      // Create
      const id = crypto.randomUUID();
      acceptedToken = await prisma.$executeRaw`
        INSERT INTO "GroupAcceptedToken" ("id", "groupId", "tokenId", "chainId", "isDefault", "createdAt", "updatedAt")
        VALUES (${id}, ${groupId}, ${tokenId}, ${chainId}, ${isDefault}, NOW(), NOW())
        RETURNING *
      `;
    }

    res.json(acceptedToken);
  } catch (error) {
    console.error("Add group accepted token error:", error);
    res.status(500).json({ error: "Failed to add accepted token" });
  }
};

export const removeGroupAcceptedToken = async (req: Request, res: Response) => {
  try {
    const { groupId, tokenId } = req.params;
    const userId = req.user!.id;

    // Verify user is in the group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    if (group.userId !== userId) {
      res
        .status(403)
        .json({ error: "Only group creator can remove accepted tokens" });
      return;
    }

    const token = await prisma.$queryRaw`
      SELECT * FROM "GroupAcceptedToken"
      WHERE "id" = ${tokenId}
    `;

    if (!Array.isArray(token) || token.length === 0) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    await prisma.$executeRaw`
      DELETE FROM "GroupAcceptedToken"
      WHERE "id" = ${tokenId}
    `;

    res.json({ success: true });
  } catch (error) {
    console.error("Remove group accepted token error:", error);
    res.status(500).json({ error: "Failed to remove accepted token" });
  }
};

export const markAsPaidController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId } = req.params;
    const { payerId, payeeId, amount, currency = "USD", currencyType = CurrencyType.FIAT } = req.body;
    const currentUserId = req.user?.id;
    
    if (!payerId || !payeeId || !amount) {
      res.status(400).json({ error: "payerId, payeeId, and amount are required" });
      return;
    }

    // Create a SETTLEMENT expense to log the payment
    const expense = await createEnhancedGroupExpense({
      groupId,
      paidBy: payerId,
      name: "Manual Settlement",
      category: "Settlement",
      amount: Number(amount),
      splitType: SplitType.SETTLEMENT,
      currency,
      currencyType,
      participants: [
        // The payer's amount should be 0 (they paid it)
        { userId: payerId, amount: 0, currency },
        // The payee's amount should be the full amount (they received it)
        { userId: payeeId, amount: Number(amount), currency },
      ],
      currentUserId: currentUserId || payerId,
      expenseDate: new Date(),
      timeLockIn: false,
    });

    res.status(200).json({ success: true, expense });
  } catch (error) {
    console.error("Mark as paid error:", error);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
};

export const removeMemberFromGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { groupId, userId } = req.params;
    const currentUserId = req.user!.id;

    // Prevent removing the group creator
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    // Only allow the group creator to remove members
    if (group.userId !== currentUserId) {
      res.status(403).json({ error: "Only the group creator can remove members" });
      return;
    }
    if (group.userId === userId) {
      res.status(400).json({ error: "Cannot remove the group creator" });
      return;
    }

    // Check for outstanding balances
    const balances = await prisma.groupBalance.findMany({
      where: {
        groupId,
        OR: [
          { userId },
          { firendId: userId },
        ],
        amount: { not: 0 },
      },
    });
    if (balances.length > 0) {
      res.status(400).json({ error: "User has outstanding balances in the group" });
      return;
    }

    // Remove the member from the group
    await prisma.groupUser.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Remove member from group error:", error);
    res.status(500).json({ error: "Failed to remove member from group" });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { name, description, currency, imageUrl, lockPrice } = req.body;
  try {
    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        description,
        defaultCurrency: currency,
        image: imageUrl,
        lockPrice,
      },
    });
    res.json(group);
  } catch (error) {
    console.error("Failed to update group:", error);
    res.status(500).json({ error: "Failed to update group" });
  }
};
