import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateGroupBalanceForParticipants } from "../services/split.service";
import { z } from "zod";
import {
  checkAccountBalance,
  convertUsdToXLM,
  createSerializedTransaction,
  submitTransaction,
  getTransactionDetails,
} from "../utils/stellar";

const settleDebtSchemaCreate = z.object({
  groupId: z.string().min(1, "Group id is required"),
  settleWithId: z.string().optional(),
  address: z.string().min(1, "Address is required"),
});

export const settleDebtCreateTransaction = async (
  req: Request,
  res: Response
) => {
  const result = settleDebtSchemaCreate.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  const { groupId, address, settleWithId } = result.data;
  const userId = req.user!.id;

  console.log("req.body", req.body);

  try {
    const balances = await prisma.groupBalance.findMany({
      where: {
        AND: [
          { userId: userId },
          { groupId: groupId },
          ...(settleWithId ? [{ firendId: settleWithId }] : []),
        ],
      },
      include: {
        friend: {
          select: {
            stellarAccount: true,
            name: true,
          },
        },
      },
    });

    console.log("balances", balances);

    const toPay = balances.filter((balance) => balance.amount > 0);

    if (toPay.length === 0) {
      res.status(400).json({ error: "No balances to pay" });
      return;
    }

    // Validate all friends have Stellar accounts
    for (const balance of toPay) {
      if (!balance.friend.stellarAccount) {
        res.status(400).json({
          error: `Friend ${balance.friend.name} has no Stellar account`,
        });
        return;
      }
    }

    const toPayInXLM = await Promise.all(
      toPay.map(async (balance) => {
        let xlmAmount: number = 0;
        if (balance.currency === "USD") {
          xlmAmount = await convertUsdToXLM(balance.amount);
        } else {
          xlmAmount = Number(balance.amount);
        }
        return {
          address: balance.friend.stellarAccount!,
          amount: xlmAmount.toString(),
          originalAmount: balance.amount,
          originalCurrency: balance.currency,
          friendId: balance.firendId,
          xlmAmount,
        };
      })
    );

    const totalAmount = toPayInXLM.reduce(
      (acc, balance) => acc + Number(balance.xlmAmount),
      0
    );

    const accountBalance = await checkAccountBalance(address);

    const XLM_BALANCE = Number(
      accountBalance.find((balance) => balance.asset_type === "native")
        ?.balance || 0
    );

    if (XLM_BALANCE < totalAmount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const transaction = await createSerializedTransaction(
      address,
      toPayInXLM.map((balance) => ({
        address: balance.address,
        amount: balance.amount,
      }))
    );

    // Store the transaction details in the database
    const settlementTransaction = await prisma.settlementTransaction.create({
      data: {
        userId: userId,
        groupId: groupId,
        serializedTx: transaction.serializedTx,
        settleWithId: settleWithId,
        status: "PENDING",
        settlementItems: {
          create: toPayInXLM.map((item) => ({
            userId: userId,
            friendId: item.friendId,
            originalAmount: item.originalAmount,
            originalCurrency: item.originalCurrency,
            xlmAmount: item.xlmAmount,
          })),
        },
      },
    });

    res.json({
      serializedTx: transaction.serializedTx,
      txHash: transaction.txHash,
      settlementId: settlementTransaction.id,
    });
  } catch (error) {
    console.error("Create settlement transaction error:", error);
    res.status(500).json({ error: "Failed to create settlement transaction" });
  }
};

const settleDebtSchemaSubmit = z.object({
  groupId: z.string().min(1, "Group id is required"),
  signedTx: z.string().min(1, "signedTx is required"),
  settlementId: z.string().min(1, "settlementId is required"),
  settleWithId: z.string().optional(),
});

export const settleDebtSubmitTransaction = async (
  req: Request,
  res: Response
) => {
  const result = settleDebtSchemaSubmit.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({ error: result.error.issues });
    return;
  }

  const { signedTx, groupId, settlementId, settleWithId } = result.data;
  const userId = req.user!.id;

  try {
    // Get the stored settlement transaction
    const settlementTransaction = await prisma.settlementTransaction.findFirst({
      where: {
        id: settlementId,
        userId: userId,
        groupId: groupId,
        settleWithId: settleWithId || null,
        status: "PENDING",
      },
      include: {
        settlementItems: {
          include: {
            friend: {
              select: {
                stellarAccount: true,
              },
            },
          },
        },
      },
    });

    if (!settlementTransaction) {
      res.status(404).json({ error: "Settlement transaction not found" });
      return;
    }

    // Verify the transaction is the same by comparing transaction details
    const txDetails = await getTransactionDetails(signedTx);

    // Extract payment operations from the signed transaction
    const paymentOperations = txDetails.operations.filter(
      (op: any) => op.type === "payment" && op.asset_type === "native"
    );

    // Verify each payment in the transaction matches a settlement item
    let isValid = true;

    // Check that each payment in the transaction matches a settlement item
    for (const operation of paymentOperations) {
      const recipient = operation.to;
      const amount = parseFloat(operation.amount || "0");

      // Find the matching settlement item
      const matchingItem = settlementTransaction.settlementItems.find(
        (item) =>
          item.friend.stellarAccount === recipient &&
          Math.abs(item.xlmAmount - amount) < 0.00001 // Account for floating point precision
      );

      if (!matchingItem) {
        isValid = false;
        break;
      }
    }

    // Also check that every settlement item has a matching payment operation
    if (
      isValid &&
      paymentOperations.length !== settlementTransaction.settlementItems.length
    ) {
      isValid = false;
    }

    if (!isValid) {
      // Update the settlement status to FAILED
      await prisma.settlementTransaction.update({
        where: { id: settlementId },
        data: { status: "FAILED" },
      });

      res.status(400).json({
        error: "The signed transaction does not match the original settlement",
      });
      return;
    }

    // Submit the transaction to the Stellar network
    const submitTransactionResponse = await submitTransaction(signedTx);

    if (!submitTransactionResponse.successful) {
      // Update the settlement status to FAILED
      await prisma.settlementTransaction.update({
        where: { id: settlementId },
        data: { status: "FAILED" },
      });

      res.status(400).json({ error: "Transaction failed on Stellar network" });
      return;
    }

    // Update the settlement status to COMPLETED
    await prisma.settlementTransaction.update({
      where: { id: settlementId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        transactionHash: submitTransactionResponse.hash,
      },
    });

    // Update group balances based on the settlement items
    const participants = settlementTransaction.settlementItems.map((item) => ({
      userId: item.friendId,
      amount: item.originalAmount,
      currency: item.originalCurrency,
    }));

    await updateGroupBalanceForParticipants(participants, userId, groupId);

    res.json({
      hash: submitTransactionResponse.hash,
      settlementId: settlementTransaction.id,
    });
  } catch (error: any) {
    console.error(
      "Settlement transaction submission error:",
      error.message,
      error?.response?.data,
      error?.response?.data?.extras
    );

    // Update the settlement status to FAILED if it exists
    if (settlementId) {
      await prisma.settlementTransaction
        .update({
          where: { id: settlementId },
          data: { status: "FAILED" },
        })
        .catch(() => {}); // Ignore errors in updating status
    }

    res.status(500).json({ error: "Failed to submit transaction" });
  }
};
