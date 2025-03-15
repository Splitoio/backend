import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Horizon,
  Transaction,
  Keypair,
} from "@stellar/stellar-sdk";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateGroupBalanceForParticipants } from "../services/split.service";
import { z } from "zod";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

const checkAccountExists = async (publicKey: string) => {
  try {
    await server.loadAccount(publicKey);
    console.log("✅ Account exists.");
  } catch (error) {
    console.log("❌ Account does not exist.");
  }
};

const checkBalance = async (accountId: string) => {
  const account = await server.loadAccount(accountId);
  console.log("Balances: ", account.balances);
};

export const createTransaction = async (
  sourcePublicKey: string,
  transactions: { address: string; amount: string }[]
) => {
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

  const serializedTransaction = transaction.setTimeout(60).build().toXDR();

  return serializedTransaction;
};

const submitTransaction = async (signedTx: string) => {
  const gasPayerKeypair = Keypair.fromSecret(process.env.SECRET_KEY!);

  const BASE_FEE = await server.fetchBaseFee();

  const transaction = new Transaction(signedTx, Networks.TESTNET);

  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    gasPayerKeypair,
    BASE_FEE.toString(), // Higher fee if needed
    transaction,
    Networks.TESTNET
  );

  feeBumpTx.sign(gasPayerKeypair);

  const response = await server.submitTransaction(feeBumpTx);
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
