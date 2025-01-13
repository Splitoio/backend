// src/services/split.service.ts
import { Prisma, SplitType } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Participant = {
  userId: number;
  amount: number;
};

export const createGroupExpense = async (
  groupId: number,
  paidBy: number,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: Participant[],
  addedBy: number,
  expenseDate: Date,
  fileKey?: string,
) => {
  return await prisma.$transaction(async (tx) => {
    // Create the expense
    const expense = await tx.expense.create({
      data: {
        paidBy,
        addedBy,
        name,
        category,
        amount,
        splitType,
        currency,
        groupId,
        expenseDate,
        fileKey,
        expenseParticipants: {
          createMany: {
            data: participants,
          },
        },
      },
      include: {
        expenseParticipants: true,
      },
    });

    // Update balances for all participants
    for (const participant of participants) {
      if (participant.userId === paidBy) continue;

      // Update or create group balance
      await tx.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            firendId: participant.userId,
            userId: paidBy,
          },
        },
        create: {
          groupId,
          currency,
          userId: paidBy,
          firendId: participant.userId,
          amount: participant.amount,
        },
        update: {
          amount: {
            increment: participant.amount,
          },
        },
      });

      // Mirror balance for the other user
      await tx.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            firendId: paidBy,
            userId: participant.userId,
          },
        },
        create: {
          groupId,
          currency,
          userId: participant.userId,
          firendId: paidBy,
          amount: -participant.amount,
        },
        update: {
          amount: {
            decrement: participant.amount,
          },
        },
      });
    }

    return expense;
  });
};

export const addUserExpense = async (
  paidBy: number,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: Participant[],
  addedBy: number,
  expenseDate: Date,
  fileKey?: string,
) => {
  return await prisma.$transaction(async (tx) => {
    // Create the expense
    const expense = await tx.expense.create({
      data: {
        paidBy,
        addedBy,
        name,
        category,
        amount,
        splitType,
        currency,
        expenseDate,
        fileKey,
        expenseParticipants: {
          createMany: {
            data: participants,
          },
        },
      },
      include: {
        expenseParticipants: true,
      },
    });

    // Update balances for all participants
    for (const participant of participants) {
      if (participant.userId === paidBy) continue;

      // Update or create balance
      await tx.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: paidBy,
            currency,
            friendId: participant.userId,
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: participant.amount,
        },
        update: {
          amount: {
            increment: participant.amount,
          },
        },
      });

      // Mirror balance for the other user
      await tx.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency,
            friendId: paidBy,
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: -participant.amount,
        },
        update: {
          amount: {
            decrement: participant.amount,
          },
        },
      });
    }

    return expense;
  });
};

export const deleteExpense = async (expenseId: string, deletedBy: number) => {
  return await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: {
        expenseParticipants: true,
      },
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // If it's a group expense, update group balances
    if (expense.groupId) {
      for (const participant of expense.expenseParticipants) {
        if (participant.userId === expense.paidBy) continue;

        // Reverse the balance for the payer
        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              firendId: participant.userId,
              userId: expense.paidBy,
            },
          },
          data: {
            amount: {
              decrement: participant.amount,
            },
          },
        });

        // Reverse the balance for the participant
        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              firendId: expense.paidBy,
              userId: participant.userId,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        });
      }
    }

    // Mark expense as deleted
    const deletedExpense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });

    return deletedExpense;
  });
};

export const editExpense = async (
  expenseId: string,
  paidBy: number,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: Participant[],
  updatedBy: number,
  expenseDate: Date,
  fileKey?: string,
) => {
  return await prisma.$transaction(async (tx) => {
    const oldExpense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: {
        expenseParticipants: true,
      },
    });

    if (!oldExpense) {
      throw new Error('Expense not found');
    }

    // Reverse old balances
    if (oldExpense.groupId) {
      for (const participant of oldExpense.expenseParticipants) {
        if (participant.userId === oldExpense.paidBy) continue;

        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: oldExpense.groupId,
              currency: oldExpense.currency,
              firendId: participant.userId,
              userId: oldExpense.paidBy,
            },
          },
          data: {
            amount: {
              decrement: participant.amount,
            },
          },
        });

        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: oldExpense.groupId,
              currency: oldExpense.currency,
              firendId: oldExpense.paidBy,
              userId: participant.userId,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        });
      }
    }

    // Delete old participants
    await tx.expenseParticipant.deleteMany({
      where: {
        expenseId,
      },
    });

    // Update expense
    const updatedExpense = await tx.expense.update({
      where: { id: expenseId },
      data: {
        paidBy,
        name,
        category,
        amount,
        splitType,
        currency,
        expenseDate,
        fileKey,
        updatedBy,
        expenseParticipants: {
          createMany: {
            data: participants,
          },
        },
      },
      include: {
        expenseParticipants: true,
      },
    });

    // Add new balances
    if (oldExpense.groupId) {
      for (const participant of participants) {
        if (participant.userId === paidBy) continue;

        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: oldExpense.groupId,
              currency,
              firendId: participant.userId,
              userId: paidBy,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        });

        await tx.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: oldExpense.groupId,
              currency,
              firendId: paidBy,
              userId: participant.userId,
            },
          },
          data: {
            amount: {
              decrement: participant.amount,
            },
          },
        });
      }
    }

    return updatedExpense;
  });
};