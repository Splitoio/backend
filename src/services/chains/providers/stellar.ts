import {
  TransactionRequest,
  SerializedTransaction,
  TransactionResult,
  FeeEstimate,
} from "../../../types/chains";
import { BaseChainProvider } from "./base";
import {
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Horizon,
  Transaction,
  Keypair,
} from "@stellar/stellar-sdk";
import { env } from "../../../config/env";
import axios from "axios";

export class StellarProvider extends BaseChainProvider {
  private server: Horizon.Server;
  private network: Networks;

  constructor() {
    super("stellar");
    this.server = new Horizon.Server("https://horizon-testnet.stellar.org");
    this.network = Networks.TESTNET;
  }

  async connect(address: string): Promise<boolean> {
    try {
      await this.server.loadAccount(address);
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getBalance(address: string, tokenId?: string): Promise<string> {
    try {
      const account = await this.server.loadAccount(address);

      // If we're checking for native XLM balance
      if (!tokenId || tokenId === "native" || tokenId === "xlm") {
        const nativeBalance = account.balances.find(
          (balance: any) => balance.asset_type === "native"
        );
        return nativeBalance?.balance || "0";
      }

      // If we're checking for a specific token (non-native asset)
      const tokenBalance = account.balances.find(
        (balance: any) =>
          balance.asset_code === tokenId.toUpperCase() &&
          balance.asset_type !== "native"
      );

      return tokenBalance?.balance || "0";
    } catch (error) {
      console.error("Error fetching Stellar balance:", error);
      return "0";
    }
  }

  async createTransaction(
    sourceAddress: string,
    transactions: TransactionRequest[]
  ): Promise<SerializedTransaction> {
    const account = await this.server.loadAccount(sourceAddress);
    const fee = await this.server.fetchBaseFee();

    const transaction = new TransactionBuilder(account, {
      fee: fee.toString(),
      networkPassphrase: this.network,
    });

    transactions.forEach((tx) => {
      transaction.addOperation(
        Operation.payment({
          destination: tx.to,
          asset:
            tx.tokenId && tx.tokenId !== "native"
              ? new Asset(tx.tokenId.toUpperCase(), sourceAddress) // Assuming token issuer is source address
              : Asset.native(),
          amount: tx.amount,
        })
      );
    });

    const builtTx = transaction.setTimeout(60).build();
    const serializedTx = builtTx.toXDR();

    return {
      serializedTx,
      txHash: builtTx.hash().toString("hex"),
      chainId: this.chainId,
    };
  }

  async submitTransaction(signedTx: string): Promise<TransactionResult> {
    try {
      const gasPayerKeypair = Keypair.fromSecret(env.SECRET_KEY);
      const BASE_FEE = await this.server.fetchBaseFee();
      const transaction = new Transaction(signedTx, this.network);

      const feeBumpTx = TransactionBuilder.buildFeeBumpTransaction(
        gasPayerKeypair,
        BASE_FEE.toString(),
        transaction,
        this.network
      );

      feeBumpTx.sign(gasPayerKeypair);
      const response = await this.server.submitTransaction(feeBumpTx);

      return {
        success: true,
        hash: response.hash,
        chainId: this.chainId,
      };
    } catch (error) {
      console.error("Error submitting Stellar transaction:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        chainId: this.chainId,
      };
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      await this.server.loadAccount(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  async estimateFees(tx: TransactionRequest): Promise<FeeEstimate> {
    try {
      const baseFee = await this.server.fetchBaseFee();

      // For Stellar, the fee is per operation, so for a simple payment
      // we can estimate with just the base fee
      return {
        fee: baseFee.toString(),
        currency: "XLM",
        estimatedTimeInSeconds: 5, // Stellar has ~5 second block time
      };
    } catch (error) {
      console.error("Error estimating Stellar fees:", error);
      return {
        fee: "0",
        currency: "XLM",
      };
    }
  }

  async convertUsdToXLM(amount: number): Promise<string> {
    try {
      const XlmToUsd = await axios.get<{ stellar: { usd: number } }>(
        "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
      );

      const XlmToUsdRate = XlmToUsd.data.stellar.usd;
      const amountInXLM = amount / XlmToUsdRate;
      return amountInXLM.toFixed(7);
    } catch (error) {
      console.error("Error converting USD to XLM:", error);
      throw new Error("Failed to convert USD to XLM");
    }
  }
}
