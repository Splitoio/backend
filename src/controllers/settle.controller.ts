import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { updateGroupBalanceForParticipants } from "../services/split.service";
import { z } from "zod";
import {
  checkAccountBalance,
  convertUsdToXLM,
  createSerializedTransaction,
  submitTransaction,
  getTransactionDetails,
  checkAccountExists,
} from "../utils/stellar";

const settleDebtSchemaCreate = z.object({
  groupId: z.string().min(1, "Group id is required"),
  settleWithId: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  selectedTokenId: z.string().optional(),
  selectedChainId: z.string().optional(),
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

  const { groupId, address, settleWithId, selectedTokenId, selectedChainId } =
    result.data;

  const userId = req.user!.id;

  try {
    const accountExists = await checkAccountExists(address);

    if (!accountExists) {
      res.status(400).json({ error: "Account does not exist" });
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

    // Determine settlement token based on selection or preferences
    let settlementToken;
    let settlementChain;

    if (selectedTokenId && selectedChainId) {
      // Use selected token if provided
      settlementToken = await prisma.token.findUnique({
        where: { id: selectedTokenId },
        include: { chain: true },
      });

      if (!settlementToken) {
        res.status(404).json({ error: "Selected token not found" });
        return;
      }

      settlementChain = settlementToken.chain;
    } else {
      // Try to find a token accepted by all parties
      let acceptableTokens: any = [];

      // If settling with specific friend
      if (settleWithId) {
        // Get friend's accepted tokens
        const friendAcceptedTokens = await prisma.userAcceptedToken.findMany({
          where: { userId: settleWithId },
          include: { token: true, chain: true },
        });

        if (friendAcceptedTokens.length > 0) {
          acceptableTokens = friendAcceptedTokens.map((t) => ({
            token: t.token,
            chain: t.chain,
            isDefault: t.isDefault,
          }));
        }
      } else {
        // Get group's accepted tokens
        const groupAcceptedTokens = await prisma.groupAcceptedToken.findMany({
          where: { groupId },
          include: { token: true, chain: true },
        });

        if (groupAcceptedTokens.length > 0) {
          acceptableTokens = groupAcceptedTokens.map((t) => ({
            token: t.token,
            chain: t.chain,
            isDefault: t.isDefault,
          }));
        }
      }

      // If no tokens found, use Stellar XLM as default
      if (acceptableTokens.length === 0) {
        // Get Stellar chain and XLM token
        const stellarChain = await prisma.supportedChain.findFirst({
          where: { id: "stellar" },
        });

        const xlmToken = await prisma.token.findFirst({
          where: {
            chainId: "stellar",
            symbol: "XLM",
          },
        });

        if (!stellarChain || !xlmToken) {
          res
            .status(500)
            .json({ error: "Default settlement token not configured" });
          return;
        }

        settlementToken = xlmToken;
        settlementChain = stellarChain;
      } else {
        // Find default token or use first one
        const defaultToken = acceptableTokens.find((t: any) => t.isDefault);

        if (defaultToken) {
          settlementToken = defaultToken.token;
          settlementChain = defaultToken.chain;
        } else {
          settlementToken = acceptableTokens[0].token;
          settlementChain = acceptableTokens[0].chain;
        }
      }
    }

    // Validate all friends have accounts on the selected chain
    for (const balance of toPay) {
      if (!balance.friend.stellarAccount && settlementChain.id === "stellar") {
        res.status(400).json({
          error: `Friend ${balance.friend.name} has no Stellar account`,
        });
        return;
      }

      // If using other chains, check the corresponding account
      if (settlementChain.id !== "stellar") {
        const friendChainAccount = await prisma.chainAccount.findFirst({
          where: {
            userId: balance.firendId,
            chainId: settlementChain.id,
          },
        });

        if (!friendChainAccount) {
          res.status(400).json({
            error: `Friend ${balance.friend.name} has no ${settlementChain.name} account`,
          });
          return;
        }
      }
    }

    const toPayInSettlementToken = await Promise.all(
      toPay.map(async (balance) => {
        let convertedAmount: string = "0";
        let tokenAmount: number = 0;

        // Convert from USD or other currencies to settlement token
        if (balance.currency === "USD" && settlementToken.symbol === "XLM") {
          // Use existing conversion for USD to XLM
          convertedAmount = await convertUsdToXLM(balance.amount);
          tokenAmount = Number(convertedAmount);
        } else if (balance.currency === "USD") {
          // TODO: Implement conversion from USD to other tokens
          // For now, just use a 1:1 conversion
          tokenAmount = balance.amount;
          convertedAmount = balance.amount.toString();
        } else {
          // Same token, no conversion needed
          tokenAmount = balance.amount;
          convertedAmount = balance.amount.toString();
        }

        return {
          address: balance.friend.stellarAccount || "", // Will be replaced with chain-specific address
          amount: convertedAmount.toString(),
          originalAmount: balance.amount,
          originalCurrency: balance.currency,
          friendId: balance.firendId,
          tokenAmount: tokenAmount,
        };
      })
    );

    // For non-Stellar chains, get the proper recipient addresses
    if (settlementChain.id !== "stellar") {
      for (let i = 0; i < toPayInSettlementToken.length; i++) {
        const payment = toPayInSettlementToken[i];
        const friendChainAccount = await prisma.chainAccount.findFirst({
          where: {
            userId: payment.friendId,
            chainId: settlementChain.id,
          },
        });

        if (friendChainAccount) {
          toPayInSettlementToken[i].address = friendChainAccount.address;
        }
      }
    }

    const totalAmount = toPayInSettlementToken.reduce(
      (acc, balance) => acc + Number(balance.tokenAmount),
      0
    );

    // Check if user has enough balance for settlement
    const accountBalance = await checkAccountBalance(address);

    console.log("accountBalance", accountBalance);

    // This is Stellar-specific, modify for other chains
    const tokenBalance =
      settlementChain.id === "stellar"
        ? Number(
            accountBalance.find((balance) => balance.asset_type === "native")
              ?.balance || 0
          )
        : 0; // For other chains, implement balance checking

    if (tokenBalance < totalAmount && settlementChain.id === "stellar") {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    // Create transaction
    let transaction;

    // For now, only implement Stellar transaction creation
    if (settlementChain.id === "stellar") {
      transaction = await createSerializedTransaction(
        address,
        toPayInSettlementToken.map((balance) => ({
          address: balance.address,
          amount: balance.amount,
        }))
      );
    } else {
      // TODO: Implement transaction creation for other chains
      res
        .status(400)
        .json({ error: "Settlement on this chain not yet implemented" });
      return;
    }

    // Store the transaction details in the database
    const settlementTransaction = await prisma.settlementTransaction.create({
      data: {
        userId: userId,
        groupId: groupId,
        serializedTx: transaction.serializedTx,
        settleWithId: settleWithId,
        status: "PENDING",
        chainId: settlementChain.id,
        tokenId: settlementToken.id,
        settlementItems: {
          create: toPayInSettlementToken.map((item) => ({
            userId: userId,
            friendId: item.friendId,
            originalAmount: item.originalAmount,
            originalCurrency: item.originalCurrency,
            xlmAmount: item.tokenAmount, // For backward compatibility
            amount: item.tokenAmount,
            currency: settlementToken.symbol,
            friend: {
              connect: {
                id: item.friendId,
              },
            },
          })),
        },
      },
    });

    res.json({
      serializedTx: transaction.serializedTx,
      txHash: transaction.txHash,
      settlementId: settlementTransaction.id,
      tokenSymbol: settlementToken.symbol,
      chainName: settlementChain.name,
    });
  } catch (error) {
    console.error("Create settlement transaction error:", error);
    res.status(500).json({ error: "Failed to create settlement transaction" });
  }
};

const settleDebtSchemaSubmit = z.object({
  groupId: z.string().min(1, "Group id is required"),
  signedTx: z.string().min(1, "signedTx is required"),
  settlementId: z.string().min(1, "settlementId is required"),
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

  const { signedTx, groupId, settlementId, settleWithId } = result.data;
  const userId = req.user!.id;

  try {
    // Get the stored settlement transaction
    const settlementTransaction = await prisma.settlementTransaction.findFirst({
      where: {
        id: settlementId,
        userId: userId,
        groupId: groupId,
        settleWithId: settleWithId || null,
        status: "PENDING",
      },
      include: {
        settlementItems: {
          include: {
            friend: {
              select: {
                stellarAccount: true,
              },
            },
          },
        },
      },
    });

    if (!settlementTransaction) {
      res.status(404).json({ error: "Settlement transaction not found" });
      return;
    }

    // Verify the transaction is the same by comparing transaction details
    const txDetails = await getTransactionDetails(signedTx);

    // Extract payment operations from the signed transaction
    const paymentOperations = txDetails.operations.filter(
      (op: any) => op.type === "payment" && op.asset_type === "native"
    );

    // Verify each payment in the transaction matches a settlement item
    let isValid = true;

    // Check that each payment in the transaction matches a settlement item
    for (const operation of paymentOperations) {
      const recipient = operation.to;
      const amount = parseFloat(operation.amount || "0");

      // Find the matching settlement item
      const matchingItem = settlementTransaction.settlementItems.find(
        (item) =>
          item.friend.stellarAccount === recipient &&
          Math.abs(item.amount - amount) < 0.00001 // Account for floating point precision
      );

      if (!matchingItem) {
        isValid = false;
        break;
      }
    }

    // Also check that every settlement item has a matching payment operation
    if (
      isValid &&
      paymentOperations.length !== settlementTransaction.settlementItems.length
    ) {
      isValid = false;
    }

    if (!isValid) {
      // Update the settlement status to FAILED
      await prisma.settlementTransaction.update({
        where: { id: settlementId },
        data: { status: "FAILED" },
      });

      res.status(400).json({
        error: "The signed transaction does not match the original settlement",
      });
      return;
    }

    // Submit the transaction to the Stellar network
    const submitTransactionResponse = await submitTransaction(signedTx);

    if (!submitTransactionResponse.successful) {
      // Update the settlement status to FAILED
      await prisma.settlementTransaction.update({
        where: { id: settlementId },
        data: { status: "FAILED" },
      });

      res.status(400).json({ error: "Transaction failed on Stellar network" });
      return;
    }

    // Update the settlement status to COMPLETED
    await prisma.settlementTransaction.update({
      where: { id: settlementId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        transactionHash: submitTransactionResponse.hash,
      },
    });

    // Update group balances based on the settlement items
    const participants = settlementTransaction.settlementItems.map((item) => ({
      userId: item.friendId,
      amount: item.amount,
      currency: item.currency,
    }));

    await updateGroupBalanceForParticipants(participants, userId, groupId);

    res.json({
      hash: submitTransactionResponse.hash,
      settlementId: settlementTransaction.id,
    });
  } catch (error: any) {
    console.error(
      "Settlement transaction submission error:",
      error.message,
      error?.response?.data,
      error?.response?.data?.extras
    );

    // Update the settlement status to FAILED if it exists
    if (settlementId) {
      await prisma.settlementTransaction
        .update({
          where: { id: settlementId },
          data: { status: "FAILED" },
        })
        .catch(() => {}); // Ignore errors in updating status
    }

    res.status(500).json({ error: "Failed to submit transaction" });
  }
};

export const getSettlementTokenOptions = async (
  req: Request,
  res: Response
) => {
  try {
    const { groupId, settleWithId } = req.query;
    const userId = req.user!.id;

    if (!groupId) {
      res.status(400).json({ error: "Group ID is required" });
      return;
    }

    // Find tokens accepted by all parties
    let tokensToReturn = [];

    // Get group's accepted tokens
    const groupAcceptedTokens = await prisma.$queryRaw`
      SELECT gt.*, t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
             sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl
      FROM "GroupAcceptedToken" gt
      JOIN "Token" t ON gt."tokenId" = t.id
      JOIN "SupportedChain" sc ON gt."chainId" = sc.id
      WHERE gt."groupId" = ${groupId}
    `;

    if (Array.isArray(groupAcceptedTokens) && groupAcceptedTokens.length > 0) {
      tokensToReturn.push({
        source: "Group",
        tokens: groupAcceptedTokens,
      });
    }

    // If settling with specific user, add their tokens
    if (settleWithId) {
      const friendAcceptedTokens = await prisma.$queryRaw`
        SELECT ut.*, t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
               sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl
        FROM "UserAcceptedToken" ut
        JOIN "Token" t ON ut."tokenId" = t.id
        JOIN "SupportedChain" sc ON ut."chainId" = sc.id
        WHERE ut."userId" = ${settleWithId}
      `;

      if (
        Array.isArray(friendAcceptedTokens) &&
        friendAcceptedTokens.length > 0
      ) {
        tokensToReturn.push({
          source: "Friend",
          tokens: friendAcceptedTokens,
        });
      }
    }

    // Add current user's tokens
    const userAcceptedTokens = await prisma.$queryRaw`
      SELECT ut.*, t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
             sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl
      FROM "UserAcceptedToken" ut
      JOIN "Token" t ON ut."tokenId" = t.id
      JOIN "SupportedChain" sc ON ut."chainId" = sc.id
      WHERE ut."userId" = ${userId}
    `;

    if (Array.isArray(userAcceptedTokens) && userAcceptedTokens.length > 0) {
      tokensToReturn.push({
        source: "Your Preferences",
        tokens: userAcceptedTokens,
      });
    }

    // If no tokens found, add default Stellar XLM token
    if (tokensToReturn.length === 0) {
      const defaultTokens = await prisma.$queryRaw`
        SELECT t.id as "tokenId", t.name, t.symbol, t.decimals, t.type, t.logoUrl, 
               sc.id as "chainId", sc.name as chainName, sc.currency as chainCurrency, sc.logoUrl as chainLogoUrl,
               true as "isDefault"
        FROM "Token" t
        JOIN "SupportedChain" sc ON t."chainId" = sc.id
        WHERE sc.id = 'stellar' AND t.symbol = 'XLM'
      `;

      if (Array.isArray(defaultTokens) && defaultTokens.length > 0) {
        tokensToReturn.push({
          source: "Default Options",
          tokens: defaultTokens,
        });
      }
    }

    res.json({
      options: tokensToReturn,
    });
  } catch (error) {
    console.error("Get settlement token options error:", error);
    res.status(500).json({ error: "Failed to get settlement token options" });
  }
};
