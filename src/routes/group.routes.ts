// src/routes/group.routes.ts
import express from "express";
import { getSession } from "../middleware/auth";
import {
  createGroup,
  getAllGroups,
  getAllGroupsWithBalances,
  getGroupById,
  addMemberToGroup,
  deleteGroup,
  createEnhancedExpenseController,
  getEnhancedExpensesController,
  getGroupAcceptedTokens,
  addGroupAcceptedToken,
  removeGroupAcceptedToken,
} from "../controllers/group.controller";

import {
  settleDebtSubmitTransaction,
  settleDebtCreateTransaction,
  getSettlementTokenOptions,
} from "../controllers/settle.controller";

const router = express.Router();

router.use(getSession);

router.post("/", createGroup);
router.get("/", getAllGroups);
router.get("/balances", getAllGroupsWithBalances);
router.get("/:groupId", getGroupById);
// router.get("/:groupId", getGroupById);
router.post("/:groupId/expenses", createEnhancedExpenseController);
router.post("/addMember", addMemberToGroup);

// Group accepted tokens routes
router.get("/:groupId/accepted-tokens", getGroupAcceptedTokens);
router.post("/:groupId/accepted-tokens", addGroupAcceptedToken);
router.delete("/:groupId/accepted-tokens/:tokenId", removeGroupAcceptedToken);

// Settlement routes
router.get("/settle-transaction/token-options", getSettlementTokenOptions);
router.post("/settle-transaction/create", settleDebtCreateTransaction);
router.post("/settle-transaction/submit", settleDebtSubmitTransaction);
router.delete("/:groupId", deleteGroup);

export const groupRouter = router;
