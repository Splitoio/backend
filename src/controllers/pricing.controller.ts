import { Request, Response } from "express";
import { getPricingService } from "../services/pricing";

/**
 * Get the current price of a token or currency
 */
export const getPriceController = async (req: Request, res: Response) => {
  try {
    const { id, baseCurrency = "usd" } = req.query;

    if (!id) {
      res.status(400).json({ error: "Token/currency ID is required" });
      return;
    }

    const pricingService = getPricingService();
    const price = await pricingService.getPrice(
      id as string,
      baseCurrency as string
    );

    res.status(200).json({
      id,
      baseCurrency,
      price,
    });
  } catch (error) {
    console.error("Failed to get price:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get price",
    });
  }
};

/**
 * Get the prices of multiple tokens/currencies
 */
export const getPricesController = async (req: Request, res: Response) => {
  try {
    const { ids, baseCurrency = "usd" } = req.query;

    if (!ids) {
      res.status(400).json({ error: "Token/currency IDs are required" });
      return;
    }

    const idArray = Array.isArray(ids)
      ? (ids as string[])
      : (ids as string).split(",");

    const pricingService = getPricingService();
    const prices = await pricingService.getPrices(
      idArray,
      baseCurrency as string
    );

    res.status(200).json({
      baseCurrency,
      prices,
    });
  } catch (error) {
    console.error("Failed to get prices:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get prices",
    });
  }
};

/**
 * Get the historical price of a token/currency
 */
export const getHistoricalPriceController = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, baseCurrency = "usd", date } = req.query;

    if (!id || !date) {
      res.status(400).json({
        error: "Token/currency ID and date are required",
      });
      return;
    }

    const pricingService = getPricingService();
    const price = await pricingService.getHistoricalPrice(
      id as string,
      baseCurrency as string,
      new Date(date as string)
    );

    res.status(200).json({
      id,
      baseCurrency,
      date,
      price,
    });
  } catch (error) {
    console.error("Failed to get historical price:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to get historical price",
    });
  }
};

/**
 * Get exchange rate between two currencies/tokens
 */
export const getExchangeRateController = async (
  req: Request,
  res: Response
) => {
  try {
    const { fromId, toId } = req.query;

    if (!fromId || !toId) {
      res.status(400).json({
        error: "Source and target currency/token IDs are required",
      });
      return;
    }

    const pricingService = getPricingService();
    const rate = await pricingService.getExchangeRate(
      fromId as string,
      toId as string
    );

    res.status(200).json({
      fromId,
      toId,
      rate,
    });
  } catch (error) {
    console.error("Failed to get exchange rate:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to get exchange rate",
    });
  }
};
