import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { addUserExpense, editExpense } from '../services/split.service';
import { SplitType } from '@prisma/client';

export const getCurrentUser = async (req: Request, res: Response) => {
  res.json(req.user);
};

export const getBalances = async (req: Request, res: Response) => {
  const userId = req.userData!.id;

  try {
    const balancesRaw = await prisma.balance.findMany({
      where: {
        userId,
      },
      orderBy: {
        amount: 'desc',
      },
      include: {
        friend: true,
      },
    });

    const balances = balancesRaw
      .reduce((acc, current) => {
        const existing = acc.findIndex((item) => item.friendId === current.friendId);
        if (existing === -1) {
          acc.push(current);
        } else {
          const existingItem = acc[existing];
          if (existingItem) {
            if (Math.abs(existingItem.amount) > Math.abs(current.amount)) {
              acc[existing] = { ...existingItem, hasMore: true };
            } else {
              acc[existing] = { ...current, hasMore: true };
            }
          }
        }
        return acc;
      }, [] as (typeof balancesRaw[number] & { hasMore?: boolean })[])
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const cumulatedBalances = await prisma.balance.groupBy({
      by: ['currency'],
      _sum: {
        amount: true,
      },
      where: {
        userId,
      },
    });

    const youOwe: Array<{ currency: string; amount: number }> = [];
    const youGet: Array<{ currency: string; amount: number }> = [];

    for (const b of cumulatedBalances) {
      const sumAmount = b._sum.amount;
      if (sumAmount && sumAmount > 0) {
        youGet.push({ currency: b.currency, amount: sumAmount });
      } else if (sumAmount && sumAmount < 0) {
        youOwe.push({ currency: b.currency, amount: sumAmount });
      }
    }

    res.json({ balances, cumulatedBalances, youOwe, youGet });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
};

export const getFriends = async (req: Request, res: Response) => {
  const userId = req.userData!.id;

  try {
    const balanceWithFriends = await prisma.balance.findMany({
      where: {
        userId,
      },
      select: {
        friendId: true,
      },
      distinct: ['friendId'],
    });

    const friendsIds = balanceWithFriends.map((f) => f.friendId);

    const friends = await prisma.user.findMany({
      where: {
        id: {
          in: friendsIds,
        },
      },
    });

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
};

export const addOrEditExpense = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userData!.id;
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
        res.status(403).json({ error: 'You are not a participant of this expense' });
        return 
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
          fileKey,
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
          fileKey,
        );

    res.json(expense);
  } catch (error) {
    console.error('Add/Edit expense error:', error);
    res.status(500).json({ error: 'Failed to create/edit expense' });
  }
};

export const getExpensesWithFriend = async (req: Request, res: Response) => {
  const { friendId } = req.params;
  const userId = req.userData!.id;

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          {
            paidBy: userId,
            expenseParticipants: {
              some: {
                userId: parseInt(friendId),
              },
            },
          },
          {
            paidBy: parseInt(friendId),
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
        expenseDate: 'desc',
      },
      include: {
        expenseParticipants: {
          where: {
            OR: [
              {
                userId,
              },
              {
                userId: parseInt(friendId),
              },
            ],
          },
        },
      },
    });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses with friend error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const updateUserDetails = async (req: Request, res: Response) => {
  const userId = req.userData!.id;
  const { name, currency } = req.body;

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(name && { name }),
        ...(currency && { currency }),
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Update user details error:', error);
    res.status(500).json({ error: 'Failed to update user details' });
  }
};


export const inviteFriend = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const userId = req.userData!.id;
  

  try {
    const friend = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (friend) {
      res.json(friend);
      return 
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: email.split('@')[0],
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Invite friend error:', error);
    res.status(500).json({ error: 'Failed to invite friend' });
  }
};
