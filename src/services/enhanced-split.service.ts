import { prisma } from "../lib/prisma";
import { CurrencyType, SplitType } from "@prisma/client";
import { convertAmount, getExchangeRate } from "./currency.service";

type Participant = {
  userId: string;
  amount: number;
};

type EnhancedExpenseOptions = {
  groupId: string;
  paidBy: string;
  name: string;
  category: string;
  amount: number;
  splitType: SplitType;
  currency: string;
  currencyType: CurrencyType;
  tokenId?: string;
  chainId?: string;
  timeLockIn: boolean;
  participants: Participant[];
  currentUserId: string;
  expenseDate: Date;
  fileKey?: string;
};

/**
 * Create a group expense with support for multiple currency types and time lock-in
 */
export const createEnhancedGroupExpense = async (
  options: EnhancedExpenseOptions
) => {
  const {
    groupId,
    paidBy,
    name,
    category,
    amount,
    splitType,
    currency,
    currencyType,
    tokenId,
    chainId,
    timeLockIn,
    participants,
    currentUserId,
    expenseDate,
    fileKey,
  } = options;

  const operations = [];

  // If time lock-in is enabled, store current exchange rate
  let exchangeRate = null;
  if (timeLockIn && currencyType === CurrencyType.TOKEN) {
    try {
      // Get exchange rate to USD for reference
      exchangeRate = await getExchangeRate(
        currency,
        "USD",
        CurrencyType.TOKEN,
        CurrencyType.FIAT,
        chainId
      );
    } catch (error) {
      console.error("Failed to get exchange rate for time lock-in:", error);
      // Continue without exchange rate if it fails
    }
  }

  // Create expense operation
  operations.push(
    prisma.expense.create({
      data: {
        groupId,
        paidBy,
        name,
        category,
        amount,
        splitType,
        currency,
        currencyType,
        tokenId,
        chainId,
        timeLockIn,
        exchangeRate,
        expenseParticipants: {
          create: participants.map((participant) => ({
            userId: participant.userId,
            amount: participant.amount,
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
            increment: -participant.amount,
          },
        },
        create: {
          groupId,
          currency,
          userId: paidBy,
          firendId: participant.userId,
          amount: -participant.amount,
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
            increment: participant.amount,
          },
        },
        create: {
          groupId,
          currency,
          userId: participant.userId,
          firendId: paidBy,
          amount: participant.amount,
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
            increment: -participant.amount,
          },
        },
        create: {
          userId: paidBy,
          currency,
          friendId: participant.userId,
          amount: -participant.amount,
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
            increment: participant.amount,
          },
        },
        create: {
          userId: participant.userId,
          currency,
          friendId: paidBy,
          amount: participant.amount,
        },
      })
    );
  });

  // Execute all operations in a transaction
  return prisma.$transaction(operations);
};

/**
 * Get expenses with formatted values based on time lock-in
 */
export const getExpensesWithConvertedValues = async (
  groupId: string,
  targetCurrency: string = "USD"
) => {
  // Get all expenses for the group
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      deletedAt: null,
    },
    include: {
      paidByUser: true,
      expenseParticipants: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      expenseDate: "desc",
    },
  });

  // Process each expense to add converted values
  const enhancedExpenses = await Promise.all(
    expenses.map(async (expense) => {
      let convertedAmount = expense.amount;

      // If it's a token and we need to show in fiat
      if (expense.currencyType === CurrencyType.TOKEN) {
        if (expense.timeLockIn && expense.exchangeRate) {
          // If time lock-in was enabled, use the stored exchange rate
          convertedAmount = expense.amount * expense.exchangeRate;
        } else {
          // Otherwise, get the current exchange rate
          try {
            convertedAmount = await convertAmount(
              expense.amount,
              expense.currency,
              targetCurrency,
              CurrencyType.TOKEN,
              CurrencyType.FIAT,
              expense.chainId || undefined
            );
          } catch (error) {
            console.error("Failed to convert expense amount:", error);
            // Keep the original amount if conversion fails
          }
        }
      } else if (expense.currency !== targetCurrency) {
        // If it's a different fiat currency, convert to target
        try {
          convertedAmount = await convertAmount(
            expense.amount,
            expense.currency,
            targetCurrency,
            CurrencyType.FIAT,
            CurrencyType.FIAT
          );
        } catch (error) {
          console.error("Failed to convert expense amount:", error);
        }
      }

      return {
        ...expense,
        convertedAmount,
        targetCurrency,
      };
    })
  );

  return enhancedExpenses;
};
