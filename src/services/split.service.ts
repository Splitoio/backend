// src/services/split.service.ts
import { SplitType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { toFixedNumber, toInteger } from "../utils/numbers";

type Participant = {
  userId: string;
  amount: number;
};

export const createGroupExpense = async (
  groupId: string,
  paidBy: string,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: Participant[],
  currentUserId: string,
  expenseDate: Date,
  fileKey?: string
) => {
  const operations = [];

  const modifiedAmount = toInteger(amount);

  // Create expense operation
  operations.push(
    prisma.expense.create({
      data: {
        groupId,
        paidBy,
        name,
        category,
        amount: modifiedAmount,
        splitType,
        currency,
        expenseParticipants: {
          create: participants.map((participant) => ({
            userId: participant.userId,
            amount: toInteger(participant.amount),
          })),
        },
        fileKey,
        addedBy: currentUserId,
        expenseDate,
      },
    })
  );

  // Update group balances and overall balances operations
  participants.forEach((participant) => {
    if (participant.userId === paidBy) {
      return;
    }

    //participant.amount will be in negative

    // Update balance where participant owes to the payer
    operations.push(
      prisma.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
        create: {
          groupId,
          currency,
          userId: paidBy,
          firendId: participant.userId,
          amount: -toInteger(participant.amount),
        },
      })
    );

    // Update balance where payer owes to the participant (opposite balance)
    operations.push(
      prisma.groupBalance.upsert({
        where: {
          groupId_currency_firendId_userId: {
            groupId,
            currency,
            firendId: paidBy,
            userId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
        create: {
          groupId,
          currency,
          userId: participant.userId,
          firendId: paidBy,
          amount: toInteger(participant.amount), // Negative because it's the opposite balance
        },
      })
    );

    // Update payer's balance towards the participant
    operations.push(
      prisma.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: paidBy,
            currency,
            friendId: participant.userId,
          },
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -toInteger(participant.amount),
        },
      })
    );

    // Update participant's balance towards the payer
    operations.push(
      prisma.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency,
            friendId: paidBy,
          },
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: toInteger(participant.amount), // Negative because it's the opposite balance
        },
      })
    );
  });

  // Execute all operations in a transaction
  const result = await prisma.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    participants.map((p) => p.userId),
    currency
  );

  return result[0];
};

export const addUserExpense = async (
  paidBy: string,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: Participant[],
  addedBy: string,
  expenseDate: Date,
  fileKey?: string
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

export async function editExpense(
  expenseId: string,
  paidBy: string,
  name: string,
  category: string,
  amount: number,
  splitType: SplitType,
  currency: string,
  participants: { userId: string; amount: number }[],
  currentUserId: string,
  expenseDate: Date,
  fileKey?: string
) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      expenseParticipants: true,
    },
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  const operations = [];

  // First reverse all existing balances
  for (const participant of expense.expenseParticipants) {
    if (participant.userId === expense.paidBy) {
      continue;
    }

    operations.push(
      prisma.balance.update({
        where: {
          userId_currency_friendId: {
            userId: expense.paidBy,
            currency: expense.currency,
            friendId: participant.userId,
          },
        },
        data: {
          amount: {
            increment: participant.amount,
          },
        },
      })
    );

    operations.push(
      prisma.balance.update({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency: expense.currency,
            friendId: expense.paidBy,
          },
        },
        data: {
          amount: {
            decrement: participant.amount,
          },
        },
      })
    );

    // Reverse group balances if it's a group expense
    if (expense.groupId) {
      operations.push(
        prisma.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: expense.paidBy,
              firendId: participant.userId,
            },
          },
          data: {
            amount: {
              increment: participant.amount,
            },
          },
        })
      );

      operations.push(
        prisma.groupBalance.update({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: participant.userId,
              firendId: expense.paidBy,
            },
          },
          data: {
            amount: {
              decrement: participant.amount,
            },
          },
        })
      );
    }
  }

  // Delete existing participants
  operations.push(
    prisma.expenseParticipant.deleteMany({
      where: {
        expenseId,
      },
    })
  );

  // Update expense with new details and create new participants
  operations.push(
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        paidBy,
        name,
        category,
        amount: toInteger(amount),
        splitType,
        currency,
        expenseParticipants: {
          create: participants.map((participant) => ({
            userId: participant.userId,
            amount: toInteger(participant.amount),
          })),
        },
        fileKey,
        expenseDate,
        updatedBy: currentUserId,
      },
    })
  );

  // Add new balances
  participants.forEach((participant) => {
    if (participant.userId === paidBy) {
      return;
    }

    operations.push(
      prisma.balance.upsert({
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
          amount: -toInteger(participant.amount),
        },
        update: {
          amount: {
            increment: -toInteger(participant.amount),
          },
        },
      })
    );

    operations.push(
      prisma.balance.upsert({
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
          amount: toInteger(participant.amount),
        },
        update: {
          amount: {
            increment: toInteger(participant.amount),
          },
        },
      })
    );

    // Add new group balances if it's a group expense
    if (expense.groupId) {
      operations.push(
        prisma.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency,
              userId: paidBy,
              firendId: participant.userId,
            },
          },
          create: {
            amount: -toInteger(participant.amount),
            groupId: expense.groupId,
            currency,
            userId: paidBy,
            firendId: participant.userId,
          },
          update: {
            amount: {
              increment: -toInteger(participant.amount),
            },
          },
        })
      );

      operations.push(
        prisma.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency,
              userId: participant.userId,
              firendId: paidBy,
            },
          },
          create: {
            amount: toInteger(participant.amount),
            groupId: expense.groupId,
            currency,
            userId: participant.userId,
            firendId: paidBy,
          },
          update: {
            amount: {
              increment: toInteger(participant.amount),
            },
          },
        })
      );
    }
  });

  await prisma.$transaction(operations);
  await updateGroupExpenseForIfBalanceIsZero(
    paidBy,
    participants.map((p) => p.userId),
    currency
  );
  return { id: expenseId }; // Return the updated expense
}

export async function deleteExpense(expenseId: string, deletedBy: string) {
  const expense = await prisma.expense.findUnique({
    where: {
      id: expenseId,
    },
    include: {
      expenseParticipants: true,
    },
  });

  const operations = [];

  if (!expense) {
    throw new Error("Expense not found");
  }

  for (const participant of expense.expenseParticipants) {
    // Update payer's balance towards the participant
    if (participant.userId === expense.paidBy) {
      continue;
    }

    operations.push(
      prisma.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: expense.paidBy,
            currency: expense.currency,
            friendId: participant.userId,
          },
        },
        create: {
          amount: participant.amount,
          userId: expense.paidBy,
          currency: expense.currency,
          friendId: participant.userId,
        },
        update: {
          amount: {
            decrement: -participant.amount,
          },
        },
      })
    );

    // Update participant's balance towards the payer
    operations.push(
      prisma.balance.upsert({
        where: {
          userId_currency_friendId: {
            userId: participant.userId,
            currency: expense.currency,
            friendId: expense.paidBy,
          },
        },
        create: {
          amount: -participant.amount,
          userId: participant.userId,
          currency: expense.currency,
          friendId: expense.paidBy,
        },
        update: {
          amount: {
            decrement: participant.amount,
          },
        },
      })
    );

    if (expense.groupId) {
      operations.push(
        prisma.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: expense.paidBy,
              firendId: participant.userId,
            },
          },
          create: {
            amount: participant.amount,
            groupId: expense.groupId,
            currency: expense.currency,
            userId: expense.paidBy,
            firendId: participant.userId,
          },
          update: {
            amount: {
              decrement: -participant.amount,
            },
          },
        })
      );

      operations.push(
        prisma.groupBalance.upsert({
          where: {
            groupId_currency_firendId_userId: {
              groupId: expense.groupId,
              currency: expense.currency,
              userId: participant.userId,
              firendId: expense.paidBy,
            },
          },
          create: {
            amount: -participant.amount,
            groupId: expense.groupId,
            currency: expense.currency,
            userId: participant.userId,
            firendId: expense.paidBy,
          },
          update: {
            amount: {
              decrement: participant.amount,
            },
          },
        })
      );
    }
  }

  operations.push(
    prisma.expense.update({
      where: { id: expenseId },
      data: {
        deletedBy,
        deletedAt: new Date(),
      },
    })
  );

  await prisma.$transaction(operations);
}

async function updateGroupExpenseForIfBalanceIsZero(
  userId: string,
  friendIds: Array<string>,
  currency: string
) {
  console.log("Checking for users with 0 balance to reflect in group");
  const balances = await prisma.balance.findMany({
    where: {
      userId,
      currency,
      friendId: {
        in: friendIds,
      },
      amount: 0,
    },
  });

  console.log("Total balances needs to be updated:", balances.length);

  if (balances.length) {
    await prisma.groupBalance.updateMany({
      where: {
        userId,
        firendId: {
          in: friendIds,
        },
        currency,
      },
      data: {
        amount: 0,
      },
    });

    await prisma.groupBalance.updateMany({
      where: {
        userId: {
          in: friendIds,
        },
        firendId: userId,
        currency,
      },
      data: {
        amount: 0,
      },
    });
  }
}

export async function getCompleteFriendsDetails(userId: string) {
  const balances = await prisma.balance.findMany({
    where: {
      userId,
    },
    include: {
      friend: true,
    },
  });

  const friends = balances.reduce(
    (acc, balance) => {
      const friendId = balance.friendId;
      if (!acc[friendId]) {
        acc[friendId] = {
          balances: [],
          id: balance.friendId,
          email: balance.friend.email,
          name: balance.friend.name,
        };
      }

      if (balance.amount !== 0) {
        acc[friendId]?.balances.push({
          currency: balance.currency,
          amount:
            balance.amount > 0
              ? toFixedNumber(balance.amount)
              : toFixedNumber(balance.amount),
        });
      }

      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        email?: string | null;
        name?: string | null;
        balances: { currency: string; amount: number }[];
      }
    >
  );

  return friends;
}

export async function joinGroup(userId: string, publicGroupId: string) {
  const group = await prisma.group.findUnique({
    where: {
      id: publicGroupId,
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  await prisma.groupUser.create({
    data: {
      groupId: group.id,
      userId,
    },
  });

  return group;
}
