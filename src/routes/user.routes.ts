import { Router } from "express";
import { getSession } from "../middleware/auth";
import {
  getCurrentUser,
  getBalances,
  getFriends,
  inviteFriend,
  addOrEditExpense,
  getExpensesWithFriend,
  updateUserDetails,
  addFriend,
  getUserAcceptedTokens,
  addUserAcceptedToken,
  removeUserAcceptedToken,
} from "../controllers/user.controller";

const router = Router();

// Apply authentication middleware to all user routes
router.use(getSession);

// User routes
router.get("/me", getCurrentUser);
router.get("/balances", getBalances);
router.get("/friends", getFriends);
router.post("/friends/invite", inviteFriend);
router.post("/friends/add", addFriend);
router.post("/expenses", addOrEditExpense);
router.get("/friends/:friendId/expenses", getExpensesWithFriend);
router.patch("/profile", updateUserDetails);

// Token acceptance routes
router.get("/accepted-tokens", getUserAcceptedTokens);
router.post("/accepted-tokens", addUserAcceptedToken);
router.delete("/accepted-tokens/:id", removeUserAcceptedToken);

export const userRouter = router;
