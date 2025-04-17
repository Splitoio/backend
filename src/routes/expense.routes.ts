import express from "express";
import { getSession } from "../middleware/auth";
import { updateExpenseAcceptedTokens } from "../controllers/expense.controller";

const router = express.Router();

router.use(getSession);

// Accepted tokens routes
router.put("/:expenseId/accepted-tokens", updateExpenseAcceptedTokens);

export const expenseRouter = router;
