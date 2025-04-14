import { Request, Response } from "express";
import {
  getSupportedFiatCurrencies,
  getAllCurrencies,
  getExchangeRate,
  convertAmount,
} from "../services/currency.service";
import { CurrencyType } from "@prisma/client";

/**
 * Get all supported fiat currencies
 */
export const getFiatCurrenciesController = async (
  req: Request,
  res: Response
) => {
  try {
    const currencies = await getSupportedFiatCurrencies();
    res.status(200).json({ currencies });
  } catch (error) {
    console.error("Failed to get fiat currencies:", error);
    res.status(500).json({ error: "Failed to get fiat currencies" });
  }
};

/**
 * Get all currencies (fiat and tokens)
 */
export const getAllCurrenciesController = async (
  req: Request,
  res: Response
) => {
  try {
    const currencies = await getAllCurrencies();
    res.status(200).json({ currencies });
  } catch (error) {
    console.error("Failed to get all currencies:", error);
    res.status(500).json({ error: "Failed to get all currencies" });
  }
};

/**
 * Get exchange rate between two currencies
 */
export const getExchangeRateController = async (
  req: Request,
  res: Response
) => {
  try {
    const { fromCurrency, toCurrency } = req.query;

    if (!fromCurrency || !toCurrency) {
      res.status(400).json({ error: "From and to currencies are required" });
      return;
    }

    const rate = await getExchangeRate(
      fromCurrency as string,
      toCurrency as string
    );

    res.status(200).json({ rate });
  } catch (error) {
    console.error("Failed to get exchange rate:", error);
    res.status(500).json({ error: "Failed to get exchange rate" });
  }
};

/**
 * Convert amount between currencies
 */
export const convertAmountController = async (req: Request, res: Response) => {
  try {
    const {
      amount,
      fromCurrency,
      toCurrency,
      fromType = CurrencyType.FIAT,
      toType = CurrencyType.FIAT,
      fromChainId,
      toChainId,
    } = req.query;

    if (!amount || !fromCurrency || !toCurrency) {
      res
        .status(400)
        .json({ error: "Amount, from currency, and to currency are required" });
      return;
    }

    const convertedAmount = await convertAmount(
      parseFloat(amount as string),
      fromCurrency as string,
      toCurrency as string
    );

    res.status(200).json({
      amount: parseFloat(amount as string),
      convertedAmount,
      fromCurrency,
      toCurrency,
      rate: convertedAmount / parseFloat(amount as string),
    });
  } catch (error) {
    console.error("Failed to convert amount:", error);
    res.status(500).json({ error: "Failed to convert amount" });
  }
};
