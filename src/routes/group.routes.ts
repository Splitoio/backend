// src/routes/group.routes.ts
import express from "express";
import { getSession } from "../middleware/auth";
import {
  createGroup,
  getAllGroups,
  getAllGroupsWithBalances,
  joinGroup,
  addOrEditExpense,
  getGroupById,
  addMemberToGroup,
} from "../controllers/group.controller";

import {
  settleWithEveryone,
  settleDebtSubmitTransaction,
  settleWithOne,
  settleDebtCreateTransaction,
} from "../controllers/settle.controller";

const router = express.Router();

router.use(getSession);

router.post("/", createGroup);
router.get("/", getAllGroups);
router.get("/balances", getAllGroupsWithBalances);
router.post("/join/:groupId", joinGroup);
router.get("/:groupId", getGroupById);
router.post("/:groupId/expenses", addOrEditExpense);
router.post("/addMember", addMemberToGroup);
router.post("/settleWithOne", settleWithOne);
router.post("/settle-expense/create", settleDebtCreateTransaction);
router.post("/settle-expense/submit", settleDebtSubmitTransaction);

export const groupRouter = router;
