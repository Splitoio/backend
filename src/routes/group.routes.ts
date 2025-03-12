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
  addExpense,
  getGroupExpenses,
} from "../controllers/group.controller";

const router = express.Router();

router.use(getSession);

router.post("/", createGroup);
router.get("/", getAllGroups);
router.get("/balances", getAllGroupsWithBalances);
router.post("/join/:groupId", joinGroup);
router.get("/:groupId", getGroupById);
// router.post("/:groupId/expenses", addOrEditExpense);
router.post("/addMember", addMemberToGroup);
router.post("/:groupId/expenses", addExpense);
router.get("/:groupId/expenses", getGroupExpenses);

export const groupRouter = router;
