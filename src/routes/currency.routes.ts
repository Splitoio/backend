import express from "express";
import {
  getFiatCurrenciesController,
  getAllCurrenciesController,
  getExchangeRateController,
  convertAmountController,
} from "../controllers/currency.controller";

export const currencyRouter = express.Router();

currencyRouter.get("/fiat", getFiatCurrenciesController);
currencyRouter.get("/all", getAllCurrenciesController);
currencyRouter.get("/rate", getExchangeRateController);
currencyRouter.get("/convert", convertAmountController);
