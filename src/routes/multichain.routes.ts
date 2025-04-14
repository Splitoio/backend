import express from "express";
import {
  getAvailableChainsController,
  getAvailableTokensController,
  createMultiChainSettlementController,
  submitMultiChainSettlementController,
  getUserChainAccountsController,
  addUserChainAccountController,
  getAllChainsAndTokensController,
} from "../controllers/multichain-settle.controller";
import { getSession } from "../middleware/auth";

export const multiChainRouter = express.Router();

multiChainRouter.use(getSession);

// Chain and token routes
multiChainRouter.get("/chains", getAvailableChainsController);
multiChainRouter.get("/tokens/:chainId", getAvailableTokensController);

// mainlkt this route will be used in frontend, in rare case we will need individual chains.
multiChainRouter.get("/all-chains-tokens", getAllChainsAndTokensController);

// User chain accounts routes
multiChainRouter.get("/accounts", getUserChainAccountsController);
multiChainRouter.post("/accounts", addUserChainAccountController);

// Settlement routes
multiChainRouter.post("/settlements", createMultiChainSettlementController);
multiChainRouter.post(
  "/settlements/submit",
  submitMultiChainSettlementController
);
