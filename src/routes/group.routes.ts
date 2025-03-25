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
  deleteGroup,
} from "../controllers/group.controller";

import {
  settleDebtSubmitTransaction,
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
router.post("/settle-transaction/create", settleDebtCreateTransaction);
router.post("/settle-transaction/submit", settleDebtSubmitTransaction);
router.delete("/:groupId", deleteGroup);

export const groupRouter = router;
