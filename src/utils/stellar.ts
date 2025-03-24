import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Horizon,
  Transaction,
  Keypair,
} from "@stellar/stellar-sdk";
import { env } from "../config/env";
import axios from "axios";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const NETWORK = Networks.TESTNET;

export const checkAccountExists = async (publicKey: string) => {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (error) {
    return false;
  }
};

export const checkAccountBalance = async (accountId: string) => {
  const account = await server.loadAccount(accountId);
  return account.balances;
};

export const submitTransaction = async (signedTx: string) => {
  const gasPayerKeypair = Keypair.fromSecret(env.SECRET_KEY);

  const BASE_FEE = await server.fetchBaseFee();

  const transaction = new Transaction(signedTx, NETWORK);

  const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
    gasPayerKeypair,
    BASE_FEE.toString(), // Higher fee if needed
    transaction,
    NETWORK
  );

  feeBumpTx.sign(gasPayerKeypair);

  const response = await server.submitTransaction(feeBumpTx);
  return response;
};

export const createSerializedTransaction = async (
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

  const tx = transaction.setTimeout(60).build();
  const serializedTx = tx.toXDR();

  return {
    serializedTx,
    txHash: tx.hash().toString("hex"),
  };
};

export const getTransactionDetails = async (signedTx: string) => {
  try {
    const transaction = new Transaction(signedTx, NETWORK);

    // Extract operations
    const operations = transaction.operations.map((op) => {
      if (op.type === "payment") {
        return {
          type: "payment",
          to: op.destination,
          amount: op.amount,
          asset_type: op.asset.isNative() ? "native" : "credit_alphanum4",
          asset_code: op.asset.isNative() ? null : op.asset.getCode(),
          asset_issuer: op.asset.isNative() ? null : op.asset.getIssuer(),
        };
      }
      // For other operation types, return a standard format
      const baseOp: any = op;
      return {
        type: baseOp.type,
        // Include other properties but avoid duplicating 'type'
        ...Object.entries(baseOp).reduce((acc, [key, value]) => {
          if (key !== "type") {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>),
      };
    });

    return {
      source: transaction.source,
      fee: transaction.fee,
      sequence: transaction.sequence,
      operations,
      signatures: transaction.signatures.map((sig) =>
        sig.signature().toString("base64")
      ),
      hash: transaction.hash().toString("hex"),
    };
  } catch (error) {
    console.error("Error decoding transaction:", error);
    throw new Error("Invalid transaction XDR");
  }
};

export async function convertUsdToXLM(amount: number) {
  const XlmToUsd = await axios.get<{ stellar: { usd: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
  );

  const XlmToUsdRate = XlmToUsd.data.stellar.usd;
  const amountInXLM = amount / XlmToUsdRate;
  return amountInXLM;
}
