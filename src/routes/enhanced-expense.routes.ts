import express from "express";
import {
  createEnhancedExpenseController,
  getEnhancedExpensesController,
} from "../controllers/enhanced-expense.controller";

export const enhancedExpenseRouter = express.Router();

// Apply authentication middleware to all route
// Enhanced expense routes
enhancedExpenseRouter.post("/", createEnhancedExpenseController);
enhancedExpenseRouter.get("/:groupId", getEnhancedExpensesController);
