import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Horizon,
} from "@stellar/stellar-sdk";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateGroupBalanceForParticipants } from "../services/split.service";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

export const createTransaction = async (
  sourcePublicKey: string,
  transactions: { address: string; amount: string }[]
) => {
  console.log(sourcePublicKey, transactions);
  const account = await server.loadAccount(sourcePublicKey);

  const fee = await server.fetchBaseFee();

  const transaction = new TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: Networks.TESTNET,
  });

  transactions.forEach((t) => {
    transaction.addOperation(
      Operation.payment({
        destination: t.address,
        asset: Asset.native(),
        amount: t.amount,
      })
    );
  });

  const serializedTransaction = transaction.setTimeout(30).build().toXDR();

  console.log(transaction, serializedTransaction);

  return serializedTransaction;
};

const submitTransaction = async (signedTx: string) => {
  const transaction = TransactionBuilder.fromXDR(signedTx, Networks.TESTNET);
  const response = await server.submitTransaction(transaction);
  return response;
};

export const settleWithOne = async (req: Request, res: Response) => {
  const { groupId, settleWithId } = req.params;
  const userId = req.user!.id;

  try {
    const balance = prisma.groupBalance.findFirst({
      where: {
        AND: [
          { firendId: settleWithId },
          { userId: userId },
          { groupId: groupId },
        ],
      },
    });

    console.log("balance", balance);

    res.json(balance);
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

export const settleWithEveryone = async (req: Request, res: Response) => {
  const { groupId, address } = req.body;
  const userId = req.user!.id;

  try {
    const balances = await prisma.groupBalance.findMany({
      where: {
        AND: [{ userId: userId }, { groupId: groupId }],
      },
      include: {
        friend: {
          select: {
            stellarAccount: true,
          },
        },
      },
    });

    const toPay = balances.filter((balance) => balance.amount > 0);

    if (toPay.length === 0) {
      res.status(400).json({ error: "No balances to pay" });
      return;
    }

    const transaction = await createTransaction(
      address,
      toPay.map((balance) => ({
        address: balance.friend.stellarAccount!,
        amount: balance.amount.toString(),
      }))
    );

    res.json(transaction);
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

export const settleWithEveryoneSubmit = async (req: Request, res: Response) => {
  const { signedTx, groupId } = req.body;
  const userId = req.user!.id;

  console.log("signedTx", signedTx);

  try {
    const submitTransactionResponse = await submitTransaction(signedTx);

    if (!submitTransactionResponse.successful) {
      res.status(400).json({ error: "Transaction failed" });
      return;
    }

    const balances = await prisma.groupBalance.findMany({
      where: {
        AND: [{ userId: userId }, { groupId: groupId }],
      },
    });

    const participants = balances.map((balance) => ({
      userId: balance.firendId,
      amount: balance.amount,
      currency: balance.currency,
    }));

    console.log("participants", participants);

    const result = await updateGroupBalanceForParticipants(
      participants,
      userId,
      groupId
    );

    res.json(submitTransactionResponse.hash);
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};
