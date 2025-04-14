import {
  TransactionRequest,
  SerializedTransaction,
  TransactionResult,
  FeeEstimate,
} from "../../../types/chains";
import { BaseChainProvider } from "./base";
import { ethers } from "ethers";
import { env } from "../../../config/env";

export class BaseChainNetworkProvider extends BaseChainProvider {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    super("base");
    // Connect to Base mainnet
    this.provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  }

  async connect(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      this.connected = true;
      return true;
    } catch (error) {
      console.error("Error connecting to Base Chain:", error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getBalance(address: string, tokenId?: string): Promise<string> {
    try {
      if (!tokenId || tokenId.toLowerCase() === "eth") {
        // Get native ETH balance
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
      } else {
        // For ERC20 tokens, we would need the token contract address
        // This is a simplified version
        const erc20Abi = [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)",
        ];
        const tokenContract = new ethers.Contract(
          tokenId,
          erc20Abi,
          this.provider
        );
        const balance = await tokenContract.balanceOf(address);
        const decimals = await tokenContract.decimals();
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.error("Error fetching Base Chain balance:", error);
      return "0";
    }
  }

  async createTransaction(
    sourceAddress: string,
    transactions: TransactionRequest[]
  ): Promise<SerializedTransaction> {
    try {
      const tx = transactions[0];

      // Get the current gas price and nonce
      const gasPrice = await this.provider.getFeeData();
      const nonce = await this.provider.getTransactionCount(sourceAddress);

      // Create transaction object
      const transaction = {
        from: sourceAddress,
        to: tx.to,
        value: ethers.parseEther(tx.amount),
        nonce: nonce,
        gasLimit: ethers.parseUnits("21000", "wei"),
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        chainId: 8453, // Base mainnet chain ID
      };

      // Create and sign the transaction (using Transaction class)
      const txRequest = await ethers.resolveProperties(transaction);

      // Use a simpler approach with JSON serialization for this placeholder
      const rawTx = JSON.stringify(txRequest);
      const txHash = ethers.keccak256(ethers.toUtf8Bytes(rawTx));

      return {
        serializedTx: rawTx,
        txHash,
        chainId: this.chainId,
      };
    } catch (error: unknown) {
      console.error("Error creating Base Chain transaction:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create transaction: ${errorMessage}`);
    }
  }

  async submitTransaction(signedTx: string): Promise<TransactionResult> {
    try {
      // Submit the signed transaction to the network
      const tx = await this.provider.broadcastTransaction(signedTx);

      return {
        success: true,
        hash: tx.hash,
        chainId: this.chainId,
      };
    } catch (error: unknown) {
      console.error("Error submitting Base Chain transaction:", error);
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
      return ethers.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  async estimateFees(tx: TransactionRequest): Promise<FeeEstimate> {
    try {
      // Get current gas prices from the network
      const feeData = await this.provider.getFeeData();

      // Calculate estimated fee for a standard transfer (21000 gas)
      const gasLimit = ethers.parseUnits("21000", "wei");

      // Handle the possibility of maxFeePerGas being null
      const maxFee = feeData.maxFeePerGas || feeData.gasPrice;
      if (!maxFee) {
        throw new Error("Could not get fee data from network");
      }

      const estimatedFee = gasLimit * maxFee;

      return {
        fee: ethers.formatEther(estimatedFee),
        currency: "ETH",
        estimatedTimeInSeconds: 12, // Base has ~12 second block times
      };
    } catch (error) {
      console.error("Error estimating Base Chain fees:", error);
      return {
        fee: "0.0005", // Fallback value
        currency: "ETH",
        estimatedTimeInSeconds: 12,
      };
    }
  }
}
