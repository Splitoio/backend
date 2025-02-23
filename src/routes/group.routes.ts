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
} from "../controllers/group.controller";

const router = express.Router();

router.use(getSession);

router.post("/", createGroup);
router.get("/", getAllGroups);
router.get("/balances", getAllGroupsWithBalances);
router.post("/join/:groupId", joinGroup);
router.get("/:groupId", getGroupById);
router.post("/:groupId/expenses", addOrEditExpense);

export const groupRouter = router;
