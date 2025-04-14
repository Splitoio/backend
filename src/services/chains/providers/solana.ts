import {
  TransactionRequest,
  SerializedTransaction,
  TransactionResult,
  FeeEstimate,
} from "../../../types/chains";
import { BaseChainProvider } from "./base";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  clusterApiUrl,
} from "@solana/web3.js";
import { env } from "../../../config/env";

export class SolanaProvider extends BaseChainProvider {
  private connection: Connection;

  constructor() {
    super("solana");
    // Connect to Solana devnet by default
    // In production, use mainnet-beta or custom RPC URL
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  }

  async connect(address: string): Promise<boolean> {
    try {
      // Validate the public key format
      new PublicKey(address);

      // Check if account exists by trying to get its info
      const accountInfo = await this.connection.getAccountInfo(
        new PublicKey(address)
      );
      this.connected = true;
      return true;
    } catch (error) {
      console.error("Error connecting to Solana:", error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getBalance(address: string, tokenId?: string): Promise<string> {
    try {
      const publicKey = new PublicKey(address);

      // If no tokenId provided, get SOL balance
      if (!tokenId) {
        const balance = await this.connection.getBalance(publicKey);
        return (balance / LAMPORTS_PER_SOL).toString();
      } else {
        // For SPL tokens, you would need the token account
        // This is a simplified version
        // In a real implementation, you would use Token from @solana/spl-token
        return "0"; // Placeholder for token balance
      }
    } catch (error) {
      console.error("Error fetching Solana balance:", error);
      return "0";
    }
  }

  async createTransaction(
    sourceAddress: string,
    transactions: TransactionRequest[]
  ): Promise<SerializedTransaction> {
    try {
      const fromPubkey = new PublicKey(sourceAddress);
      const tx = transactions[0];
      const toPubkey = new PublicKey(tx.to);

      // Get the recent blockhash for transaction
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();

      // Create a transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: parseInt(parseFloat(tx.amount) * LAMPORTS_PER_SOL + ""),
        })
      );

      // Set the required properties
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Serialize the transaction
      const serializedTx = transaction
        .serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        .toString("base64");

      return {
        serializedTx,
        txHash: transaction.signature?.toString() || "",
        chainId: this.chainId,
      };
    } catch (error: unknown) {
      console.error("Error creating Solana transaction:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create transaction: ${errorMessage}`);
    }
  }

  async submitTransaction(signedTx: string): Promise<TransactionResult> {
    try {
      // Deserialize and submit the transaction
      const transaction = Transaction.from(Buffer.from(signedTx, "base64"));

      // Send the signed transaction to the network
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature);

      if (confirmation.value.err) {
        return {
          success: false,
          error: confirmation.value.err.toString(),
          chainId: this.chainId,
        };
      }

      return {
        success: true,
        hash: signature,
        chainId: this.chainId,
      };
    } catch (error: unknown) {
      console.error("Error submitting Solana transaction:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        chainId: this.chainId,
      };
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      new PublicKey(address);
      return true;
    } catch (error) {
      return false;
    }
  }

  async estimateFees(tx: TransactionRequest): Promise<FeeEstimate> {
    try {
      // For Solana, fees are usually fixed
      // But we can get the minimum fee from the network
      const feeCalculator = await this.connection.getRecentBlockhash();
      const fee =
        feeCalculator.feeCalculator.lamportsPerSignature / LAMPORTS_PER_SOL;

      return {
        fee: fee.toString(),
        currency: "SOL",
        estimatedTimeInSeconds: 0.4, // Solana has very fast block time
      };
    } catch (error) {
      console.error("Error estimating Solana fees:", error);
      return {
        fee: "0.000005", // Fallback value
        currency: "SOL",
        estimatedTimeInSeconds: 0.4,
      };
    }
  }
}
