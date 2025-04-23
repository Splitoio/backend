import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { getMultiChainSplitService } from "../services/initialize-multichain";
import { createLogger } from "../utils/logger";
import {
  getSupportedChains,
  getTokensByChain,
} from "../services/currency.service";

const logger = createLogger("multichain-controller");

export const getAvailableChainsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    logger.debug({ userId }, "Getting available chains for user");

    // Get chains from database instead of in-memory registry
    const availableChains = await getSupportedChains();

    logger.debug(
      { userId, chainCount: availableChains.length },
      "Retrieved available chains"
    );
    res.status(200).json({ chains: availableChains });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      "Failed to get available chains"
    );
    res.status(500).json({ error: "Failed to get available chains" });
  }
};

export const getAvailableTokensController = async (
  req: Request,
  res: Response
) => {
  try {
    const { chainId } = req.params;
    if (!chainId) {
      logger.warn("Get available tokens called without chainId");
      res.status(400).json({ error: "Chain ID is required" });
      return;
    }

    logger.debug({ chainId }, "Getting available tokens for chain");

    // Get tokens from database instead of in-memory registry
    const availableTokens = await getTokensByChain(chainId);

    logger.debug(
      { chainId, tokenCount: availableTokens.length },
      "Retrieved available tokens"
    );
    res.status(200).json({ tokens: availableTokens });
  } catch (error) {
    logger.error(
      { error, chainId: req.params.chainId },
      "Failed to get available tokens"
    );
    res.status(500).json({ error: "Failed to get available tokens" });
  }
};

export const createMultiChainSettlementController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { chainId, tokenId, groupId, transactions } = req.body;

    if (!chainId || !tokenId || !groupId || !transactions) {
      logger.warn(
        { userId, chainId, tokenId, groupId, hasTransactions: !!transactions },
        "Create settlement called with missing required fields"
      );
      res.status(400).json({
        error: "Chain ID, token ID, group ID, and transactions are required",
      });
      return;
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      logger.warn(
        { userId, transactionType: typeof transactions },
        "Transactions must be a non-empty array"
      );
      res.status(400).json({ error: "Transactions must be a non-empty array" });
      return;
    }

    logger.info(
      {
        userId,
        chainId,
        tokenId,
        groupId,
        transactionCount: transactions.length,
      },
      "Creating settlement transaction"
    );

    const multiChainService = getMultiChainSplitService();
    const serializedTx = await multiChainService.createSettlementTransaction(
      userId,
      chainId,
      tokenId,
      transactions,
      groupId
    );

    logger.info(
      { userId, txHash: serializedTx.txHash },
      "Successfully created settlement transaction"
    );
    res.status(201).json({
      serializedTx: serializedTx.serializedTx,
      txHash: serializedTx.txHash,
    });
  } catch (error) {
    logger.error(
      {
        error,
        userId: req.user?.id,
        chainId: req.body?.chainId,
        tokenId: req.body?.tokenId,
      },
      "Failed to create multi-chain settlement"
    );

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to create multi-chain settlement",
    });
  }
};

export const submitMultiChainSettlementController = async (
  req: Request,
  res: Response
) => {
  try {
    const { transactionId, signedTx } = req.body;

    if (!transactionId || !signedTx) {
      logger.warn(
        { hasTransactionId: !!transactionId, hasSignedTx: !!signedTx },
        "Submit settlement called with missing required fields"
      );
      res
        .status(400)
        .json({ error: "Transaction ID and signed transaction are required" });
      return;
    }

    logger.info({ transactionId }, "Submitting settlement transaction");
    const multiChainService = getMultiChainSplitService();
    const result = await multiChainService.submitSettlementTransaction(
      transactionId,
      signedTx
    );

    if (!result.success) {
      logger.warn(
        { transactionId, hash: result.hash, error: result.error },
        "Transaction submission failed"
      );
      res.status(400).json({
        error: result.error || "Transaction failed",
        hash: result.hash,
      });
      return;
    }

    logger.info(
      { transactionId, hash: result.hash },
      "Successfully submitted settlement transaction"
    );
    res.status(200).json({
      success: true,
      hash: result.hash,
    });
  } catch (error) {
    logger.error(
      { error, transactionId: req.body?.transactionId },
      "Failed to submit multi-chain settlement"
    );
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit multi-chain settlement",
    });
  }
};

export const getUserChainAccountsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    logger.debug({ userId }, "Getting chain accounts for user");

    const chainAccounts = await prisma.chainAccount.findMany({
      where: { userId },
      include: { chain: true },
    });

    // Include the legacy stellar account if it exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stellarAccount: true },
    });

    logger.debug(
      {
        userId,
        accountCount: chainAccounts.length,
        hasStellarAccount: !!user?.stellarAccount,
      },
      "Retrieved user chain accounts"
    );

    res.status(200).json({
      accounts: chainAccounts,
      stellarAccount: user?.stellarAccount,
    });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      "Failed to get user chain accounts"
    );
    res.status(500).json({ error: "Failed to get user chain accounts" });
  }
};

export const addUserChainAccountController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { chainId, address, isDefault } = req.body;

    if (!chainId || !address) {
      logger.warn(
        { userId, chainId, hasAddress: !!address },
        "Add chain account called with missing required fields"
      );
      res.status(400).json({ error: "Chain ID and address are required" });
      return;
    }

    logger.debug(
      { userId, chainId, address, isDefault },
      "Adding chain account for user"
    );

    // Check if chain exists
    const chain = await prisma.supportedChain.findUnique({
      where: { id: chainId },
    });

    if (!chain) {
      logger.warn({ userId, chainId }, "Chain not found when adding account");
      res.status(404).json({ error: "Chain not found" });
      return;
    }

    // If setting as default, unset any existing default for this chain
    if (isDefault) {
      logger.debug(
        { userId, chainId },
        "Unsetting previous default chain accounts"
      );
      await prisma.chainAccount.updateMany({
        where: { userId, chainId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the chain account
    const chainAccount = await prisma.chainAccount.create({
      data: {
        userId,
        chainId,
        address,
        isDefault: isDefault || false,
      },
    });

    logger.info(
      { userId, chainId, address, accountId: chainAccount.id },
      "Successfully added chain account"
    );

    res.status(201).json(chainAccount);
  } catch (error) {
    logger.error(
      {
        error,
        userId: req.user?.id,
        chainId: req.body?.chainId,
        address: req.body?.address,
      },
      "Failed to add user chain account"
    );

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to add user chain account",
    });
  }
};

export const getAllChainsAndTokensController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    logger.debug({ userId }, "Getting all chains and tokens");

    // Get chains from database
    const chains = await getSupportedChains();

    // Get tokens for each chain from database
    const chainsWithTokens = await Promise.all(
      chains.map(async (chain) => {
        const tokens = await getTokensByChain(chain.id);
        return {
          ...chain,
          tokens,
        };
      })
    );

    logger.debug(
      { userId, chainCount: chains.length },
      "Retrieved all chains and tokens"
    );

    res.status(200).json({ chainsWithTokens });
  } catch (error) {
    logger.error(
      { error, userId: req.user?.id },
      "Failed to get all chains and tokens"
    );
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to get all chains and tokens",
    });
  }
};
