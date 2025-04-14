import { ChainRegistry } from "./chains/registry";
import { TokenRegistry } from "./tokens/registry";
import { prisma } from "../lib/prisma";
import { SerializedTransaction, TransactionResult } from "../types/chains";
import { Prisma } from "@prisma/client";

export class MultiChainSplitService {
  private chainRegistry: ChainRegistry;
  private tokenRegistry: TokenRegistry;

  constructor(chainRegistry: ChainRegistry, tokenRegistry: TokenRegistry) {
    this.chainRegistry = chainRegistry;
    this.tokenRegistry = tokenRegistry;
  }

  async getChainAccount(
    userId: string,
    chainId: string
  ): Promise<string | null> {
    // Check if user has a chain-specific account
    const chainAccount = await prisma.chainAccount.findFirst({
      where: {
        userId,
        chainId,
        isDefault: true,
      },
    });

    if (chainAccount) {
      return chainAccount.address;
    }

    // Fallback to legacy stellar account if chainId is stellar
    if (chainId === "stellar") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stellarAccount: true },
      });

      return user?.stellarAccount || null;
    }

    return null;
  }

  async createSettlementTransaction(
    userId: string,
    chainId: string,
    tokenId: string,
    transactions: Array<{ to: string; amount: string }>,
    groupId: string
  ): Promise<SerializedTransaction> {
    // Get the chain provider
    const provider = this.chainRegistry.getProvider(chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ${chainId}`);
    }

    // Get user's address for this chain
    const userAddress = await this.getChainAccount(userId, chainId);
    if (!userAddress) {
      throw new Error(`User has no address for chain ${chainId}`);
    }

    // Create transaction
    const txRequests = transactions.map((tx) => ({
      to: tx.to,
      amount: tx.amount,
      tokenId: tokenId === "native" ? undefined : tokenId,
    }));

    const serializedTx = await provider.createTransaction(
      userAddress,
      txRequests
    );

    // Store in database
    await prisma.settlementTransaction.create({
      data: {
        userId,
        groupId,
        chainId,
        tokenId,
        serializedTx: serializedTx.serializedTx,
        status: "PENDING",
        // For each transaction, create a settlement item
        settlementItems: {
          create: transactions.map((tx) => {
            const [friendId] = tx.to.split(":");
            return {
              userId,
              friendId,
              amount: parseFloat(tx.amount),
              currency: tokenId,
              // Set default values for backward compatibility
              afterSettlementBalance: 0,
            };
          }),
        },
      },
    });

    return serializedTx;
  }

  async submitSettlementTransaction(
    transactionId: string,
    signedTx: string
  ): Promise<TransactionResult> {
    // Get transaction from database
    const transaction = await prisma.settlementTransaction.findUnique({
      where: { id: transactionId },
      include: { chain: true },
    });

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    // Get chain provider
    const provider = this.chainRegistry.getProvider(transaction.chainId);
    if (!provider) {
      throw new Error(`Provider not found for chain ${transaction.chainId}`);
    }

    // Submit transaction
    const result = await provider.submitTransaction(signedTx);

    // Update transaction status in database
    await prisma.settlementTransaction.update({
      where: { id: transactionId },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        completedAt: result.success ? new Date() : undefined,
        transactionHash: result.hash,
      },
    });

    return result;
  }

  async getAvailableChains(
    userId: string
  ): Promise<Array<{ id: string; name: string; enabled: boolean }>> {
    // Get all chains from the registry
    const chains = this.chainRegistry.getSupportedChains();

    // Get user's chain accounts
    const accounts = await prisma.chainAccount.findMany({
      where: { userId },
      select: { chainId: true },
    });

    // Add stellarAccount to the accounts if it exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stellarAccount: true },
    });

    const accountChainIds = new Set(
      accounts.map((acc: { chainId: string }) => acc.chainId)
    );
    if (user?.stellarAccount) {
      accountChainIds.add("stellar");
    }

    // Return chains with additional info about whether user has an account
    return chains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      enabled: accountChainIds.has(chain.id),
    }));
  }

  async getAvailableTokens(
    chainId: string
  ): Promise<
    Array<{ id: string; name: string; symbol: string; enabled: boolean }>
  > {
    return this.tokenRegistry.getTokensByChain(chainId).map((token) => ({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      enabled: token.enabled,
    }));
  }
}
