import express from "express";
import {
  getPriceController,
  getPricesController,
  getHistoricalPriceController,
  getExchangeRateController,
} from "../controllers/pricing.controller";
import { getSession } from "../middleware/auth";

export const pricingRouter = express.Router();

pricingRouter.use(getSession);

pricingRouter.get("/price", getPriceController);
pricingRouter.get("/prices", getPricesController);
pricingRouter.get("/historical", getHistoricalPriceController);
pricingRouter.get("/exchange-rate", getExchangeRateController);
