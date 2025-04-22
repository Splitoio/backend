import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import {
  addUserExpense,
  editExpense,
  getCompleteFriendsDetails,
} from "../services/split.service";
import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import { checkAccountExists } from "../utils/stellar";
import { z } from "zod";
import crypto from "crypto";

// Define the Reminder schema directly since we don't have it in generated models
const CreateReminderSchema = z.object({
  toUserId: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  message: z.string().optional(),
  type: z.enum(["PAYMENT", "SETTLEMENT"]),
});

// Extract the SplitType enum from the Prisma schema
enum SplitType {
  EQUAL = "EQUAL",
  PERCENTAGE = "PERCENTAGE",
  EXACT = "EXACT",
  SHARE = "SHARE",
  ADJUSTMENT = "ADJUSTMENT",
  SETTLEMENT = "SETTLEMENT",
}

export const getCurrentUser = async (req: Request, res: Response) => {
  res.json(req.user);
};

export const getBalances = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // const balancesRaw = await prisma.balance.findMany({
    //   where: {
    //     userId,
    //   },
    //   orderBy: {
    //     amount: "desc",
    //   },
    //   include: {
    //     friend: true,
    //   },
    // });

    // const balances = balancesRaw
    //   .reduce((acc, current) => {
    //     const existing = acc.findIndex(
    //       (item) => item.friendId === current.friendId
    //     );
    //     if (existing === -1) {
    //       acc.push(current);
    //     } else {
    //       const existingItem = acc[existing];
    //       if (existingItem) {
    //         if (Math.abs(existingItem.amount) > Math.abs(current.amount)) {
    //           acc[existing] = { ...existingItem, hasMore: true };
    //         } else {
    //           acc[existing] = { ...current, hasMore: true };
    //         }
    //       }
    //     }
    //     return acc;
    //   }, [] as ((typeof balancesRaw)[number] & { hasMore?: boolean })[])
    //   .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const cumulatedBalances = await prisma.balance.groupBy({
      by: ["currency"],
      _sum: {
        amount: true,
      },
      where: {
        userId,
      },
    });

    console.log("cumulatedBalances", cumulatedBalances);

    const youOwe: Array<{ currency: string; amount: number }> = [];
    const youGet: Array<{ currency: string; amount: number }> = [];

    for (const b of cumulatedBalances) {
      const sumAmount = b._sum.amount;
      if (sumAmount && sumAmount > 0) {
        youOwe.push({ currency: b.currency, amount: Math.abs(sumAmount) });
      } else if (sumAmount && sumAmount < 0) {
        youGet.push({ currency: b.currency, amount: Math.abs(sumAmount) });
      }
    }

    res.json({ cumulatedBalances, youOwe, youGet });
  } catch (error) {
    console.error("Get balances error:", error);
    res.status(500).json({ error: "Failed to fetch balances" });
  }
};

// export const getFriends = async (req: Request, res: Response) => {
//   const userId = req.user!.id;

//   try {
//     const balanceWithFriends = await prisma.balance.findMany({
//       where: {
//         userId,
//       },
//       select: {
//         friendId: true,
//       },
//       distinct: ['friendId'],
//     });

//     const friendsIds = balanceWithFriends.map((f) => f.friendId);

//     const friends = await prisma.user.findMany({
//       where: {
//         id: {
//           in: friendsIds,
//         },
//       },
//     });

//     res.json(friends);
//   } catch (error) {
//     console.error('Get friends error:', error);
//     res.status(500).json({ error: 'Failed to fetch friends' });
//   }
// };

export const addOrEditExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      : await addUserExpense(
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

export const getExpensesWithFriend = async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const userId = req.user!.id;

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          {
            paidBy: userId,
            expenseParticipants: {
              some: {
                userId: friendId,
              },
            },
          },
          {
            paidBy: friendId,
            expenseParticipants: {
              some: {
                userId,
              },
            },
          },
        ],
        AND: [
          {
            deletedBy: null,
          },
        ],
      },
      orderBy: {
        expenseDate: "desc",
      },
      include: {
        expenseParticipants: {
          where: {
            OR: [
              {
                userId,
              },
              {
                userId: friendId,
              },
            ],
          },
        },
      },
    });

    res.json(expenses);
  } catch (error) {
    console.error("Get expenses with friend error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

export const updateUserDetails = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { name, currency, stellarAccount, image } = req.body;

  if (stellarAccount) {
    const accountExists = await checkAccountExists(stellarAccount);
    if (!accountExists) {
      res.status(400).json({ error: "Invalid Stellar account" });
      return;
    }
  }

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(name && { name }),
        ...(currency && { currency }),
        ...(stellarAccount && { stellarAccount }),
        ...(image && { image }),
      },
    });

    const a = await auth.api.getSession({
      query: {
        disableCookieCache: true,
      },
      headers: fromNodeHeaders(req.headers),
    });

    console.log(a);

    res.json(user);
  } catch (error) {
    console.error("Update user details error:", error);
    res.status(500).json({ error: "Failed to update user details" });
  }
};

export const inviteFriend = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  const userId = req.user!.id;

  try {
    const friend = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (friend) {
      res.json(friend);
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        emailVerified: false,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Invite friend error:", error);
    res.status(500).json({ error: "Failed to invite friend" });
  }
};

export const addFriend = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { friendIdentifier } = req.body;

  try {
    const friend = await prisma.user.findFirst({
      where: {
        OR: [{ email: friendIdentifier }, { name: friendIdentifier }],
      },
    });

    if (!friend) {
      res.status(404).json({ message: "Friend not found", status: "error" });
      return;
    }
    if (friend.id === userId) {
      res
        .status(400)
        .json({ message: "Cannot add yourself as friend", status: "error" });
      return;
    }

    await prisma.$transaction([
      prisma.friendship.create({
        data: {
          userId: userId,
          friendId: friend.id,
        },
      }),
      prisma.friendship.create({
        data: {
          userId: friend.id,
          friendId: userId,
        },
      }),
    ]);

    res.json({ message: "Friend added successfully", status: "success" });
  } catch (error) {
    console.error("Add friend error:", error);
    res.status(500).json({ error: "Failed to add friend" });
  }
};

export const getFriends = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;

  try {
    const friends = await getCompleteFriendsDetails(userId);
    // const friends = await prisma.friendship.findMany({
    //   where: { userId },
    //   include: {
    //     friend: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //         image: true,
    //       },
    //     },
    //   },
    // });

    res.json(friends);
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
};

export const getUserAcceptedTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const acceptedTokens = await prisma.$queryRaw`
      SELECT ut.*, t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
             sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl
      FROM "UserAcceptedToken" ut
      JOIN "Token" t ON ut."tokenId" = t.id
      JOIN "SupportedChain" sc ON ut."chainId" = sc.id
      WHERE ut."userId" = ${userId}
    `;

    res.json(acceptedTokens);
  } catch (error) {
    console.error("Get user accepted tokens error:", error);
    res.status(500).json({ error: "Failed to fetch accepted tokens" });
  }
};

const tokenSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  chainId: z.string().min(1, "Chain ID is required"),
  isDefault: z.boolean().optional(),
});

export const addUserAcceptedToken = async (req: Request, res: Response) => {
  try {
    const result = tokenSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ error: result.error.issues });
      return;
    }

    const userId = req.user!.id;
    const { tokenId, chainId, isDefault = false } = result.data;

    // Check if token exists
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    // Check if chain exists
    const chain = await prisma.supportedChain.findUnique({
      where: { id: chainId },
    });

    if (!chain) {
      res.status(404).json({ error: "Chain not found" });
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.$executeRaw`
        UPDATE "UserAcceptedToken" 
        SET "isDefault" = false 
        WHERE "userId" = ${userId} AND "isDefault" = true
      `;
    }

    // Check if the token acceptance already exists
    const existingToken = await prisma.$queryRaw`
      SELECT * FROM "UserAcceptedToken"
      WHERE "userId" = ${userId} AND "tokenId" = ${tokenId} AND "chainId" = ${chainId}
    `;

    let acceptedToken;
    if (Array.isArray(existingToken) && existingToken.length > 0) {
      // Update existing
      acceptedToken = await prisma.$executeRaw`
        UPDATE "UserAcceptedToken"
        SET "isDefault" = ${isDefault}
        WHERE "userId" = ${userId} AND "tokenId" = ${tokenId} AND "chainId" = ${chainId}
        RETURNING *
      `;
    } else {
      // Create new
      acceptedToken = await prisma.$executeRaw`
        INSERT INTO "UserAcceptedToken" ("id", "userId", "tokenId", "chainId", "isDefault", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${userId}, ${tokenId}, ${chainId}, ${isDefault}, NOW(), NOW())
        RETURNING *
      `;
    }

    res.json(acceptedToken);
  } catch (error) {
    console.error("Add user accepted token error:", error);
    res.status(500).json({ error: "Failed to add accepted token" });
  }
};

export const removeUserAcceptedToken = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const token = await prisma.$queryRaw`
      SELECT * FROM "UserAcceptedToken"
      WHERE "id" = ${id}
    `;

    if (!Array.isArray(token) || token.length === 0) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    if (token[0].userId !== userId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }

    await prisma.$executeRaw`
      DELETE FROM "UserAcceptedToken"
      WHERE "id" = ${id}
    `;

    res.json({ success: true });
  } catch (error) {
    console.error("Remove user accepted token error:", error);
    res.status(500).json({ error: "Failed to remove accepted token" });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Get expenses where user owes money this month
    const expensesOwed = await prisma.expenseParticipant.findMany({
      where: {
        userId,
        expense: {
          paidBy: { not: userId },
          expenseDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedBy: null,
        },
      },
      include: {
        expense: true,
      },
    });

    // Get expenses where user lent money this month
    const expensesLent = await prisma.expenseParticipant.findMany({
      where: {
        userId: { not: userId },
        expense: {
          paidBy: userId,
          expenseDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          deletedBy: null,
        },
      },
      include: {
        expense: true,
      },
    });

    // Get settlements completed this month
    const settlementsCompleted = await prisma.settlementTransaction.findMany({
      where: {
        settleWithId: userId,
        status: "COMPLETED",
        completedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        settlementItems: true,
      },
    });

    // Calculate totals by currency
    const owedByCurrency: Record<string, number> = {};
    const lentByCurrency: Record<string, number> = {};
    const settledByCurrency: Record<string, number> = {};

    // Process owed expenses
    expensesOwed.forEach(
      (participant: { amount: number; expense: { currency: string } }) => {
        const { currency } = participant.expense;
        if (!owedByCurrency[currency]) {
          owedByCurrency[currency] = 0;
        }
        owedByCurrency[currency] += participant.amount;
      }
    );

    // Process lent expenses
    expensesLent.forEach(
      (participant: { amount: number; expense: { currency: string } }) => {
        const { currency } = participant.expense;
        if (!lentByCurrency[currency]) {
          lentByCurrency[currency] = 0;
        }
        lentByCurrency[currency] += participant.amount;
      }
    );

    // Process settlements
    settlementsCompleted.forEach(
      (settlement: {
        settlementItems: Array<{ currency: string; amount: number }>;
      }) => {
        settlement.settlementItems.forEach(
          (item: { currency: string; amount: number }) => {
            // Use the currency as originalCurrency and amount as originalAmount
            const currency = item.currency;
            const amount = item.amount;

            if (!settledByCurrency[currency]) {
              settledByCurrency[currency] = 0;
            }
            settledByCurrency[currency] += amount;
          }
        );
      }
    );

    // Format results
    const youOwed = Object.entries(owedByCurrency).map(
      ([currency, amount]) => ({
        currency,
        amount,
      })
    );

    const youLent = Object.entries(lentByCurrency).map(
      ([currency, amount]) => ({
        currency,
        amount,
      })
    );

    const youSettled = Object.entries(settledByCurrency).map(
      ([currency, amount]) => ({
        currency,
        amount,
      })
    );

    res.json({
      thisMonth: {
        youOwed,
        youLent,
        youSettled,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

// Reminders
export const sendReminder = async (
  req: Request,
  res: Response
): Promise<void> => {
  const fromUserId = req.user!.id;

  try {
    // Validate input using Zod schema
    const validationResult = CreateReminderSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Invalid input data",
        details: validationResult.error.format(),
      });
      return;
    }

    const { toUserId, amount, currency, message, type } = validationResult.data;

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: toUserId },
    });

    if (!receiver) {
      res.status(404).json({ error: "Recipient user not found" });
      return;
    }

    // NOTE: The Reminder model doesn't exist in Prisma schema yet
    // Temporary response until the model is added
    res.status(501).json({
      message:
        "Reminder functionality not implemented - Reminder model missing from Prisma schema",
      data: {
        fromUserId,
        toUserId,
        amount,
        currency,
        message: message || "",
        type,
        status: "PENDING",
      },
    });

    /* Uncomment after adding Reminder model to Prisma schema
    // Create reminder
    const reminder = await prisma.reminder.create({
      data: {
        fromUserId,
        toUserId,
        amount,
        currency,
        message: message || "",
        type,
        status: "PENDING",
      },
    });

    res.status(201).json(reminder);
    */
  } catch (error) {
    console.error("Send reminder error:", error);
    res.status(500).json({ error: "Failed to send reminder" });
  }
};

export const getReminders = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.user!.id;

  try {
    // NOTE: The Reminder model doesn't exist in Prisma schema yet
    // Return empty results until the model is added
    res.json({
      sent: [],
      received: [],
      message:
        "Reminder functionality not implemented - Reminder model missing from Prisma schema",
    });

    /* Uncomment after adding Reminder model to Prisma schema
    // Get reminders sent by user
    const sentReminders = await prisma.reminder.findMany({
      where: {
        fromUserId: userId,
      },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get reminders received by user
    const receivedReminders = await prisma.reminder.findMany({
      where: {
        toUserId: userId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      sent: sentReminders,
      received: receivedReminders,
    });
    */
  } catch (error) {
    console.error("Get reminders error:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
};
