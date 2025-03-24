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

  const serializedTransaction = transaction.setTimeout(60).build().toXDR();

  return serializedTransaction;
};

export async function convertUsdToXLM(amount: number) {
  const XlmToUsd = await axios.get<{ stellar: { usd: number } }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
  );

  const XlmToUsdRate = XlmToUsd.data.stellar.usd;
  const amountInXLM = amount / XlmToUsdRate;
  return amountInXLM;
}
