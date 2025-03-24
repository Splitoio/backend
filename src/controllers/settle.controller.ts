import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateGroupBalanceForParticipants } from "../services/split.service";
import { z } from "zod";
import {
  checkAccountBalance,
  convertUsdToXLM,
  createSerializedTransaction,
  submitTransaction,
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

    toPay.forEach((balance) => {
      if (!balance.friend.stellarAccount) {
        res.status(400).json({
          error: `Friend ${balance.friend.name} has no Stellar account`,
        });
        return;
      }
    });

    const ToPayInXLM = await Promise.all(
      toPay.map(async (balance) => {
        let amount: number = 0;
        if (balance.currency === "USD") {
          amount = await convertUsdToXLM(balance.amount);
        } else {
          amount = Number(balance.amount);
        }
        return {
          address: balance.friend.stellarAccount!,
          amount: amount.toString(),
        };
      })
    );

    const totalAmount = toPay.reduce(
      (acc, balance) => acc + Number(balance.amount),
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
      ToPayInXLM.map((balance) => ({
        address: balance.address,
        amount: balance.amount,
      }))
    );

    res.json(transaction);
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

const settleDebtSchemaSubmit = z.object({
  groupId: z.string().min(1, "Group id is required"),
  signedTx: z.string().min(1, "signedTx is required"),
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

  const { signedTx, groupId, settleWithId } = result.data;
  const userId = req.user!.id;

  try {
    const submitTransactionResponse = await submitTransaction(signedTx);

    if (!submitTransactionResponse.successful) {
      res.status(400).json({ error: "Transaction failed" });
      return;
    }

    const balances = await prisma.groupBalance.findMany({
      where: {
        AND: [
          { userId: userId },
          { groupId: groupId },
          ...(settleWithId ? [{ firendId: settleWithId }] : []),
        ],
      },
    });

    const participants = balances.map((balance) => ({
      userId: balance.firendId,
      amount: balance.amount,
      currency: balance.currency,
    }));

    await updateGroupBalanceForParticipants(participants, userId, groupId);

    res.json(submitTransactionResponse.hash);
  } catch (error: any) {
    console.error(
      "Get group error:",
      error.message,
      error?.response?.data,
      error?.response?.data?.extras
    );
    res.status(500).json({ error: "Failed to submit transaction" });
  }
};
