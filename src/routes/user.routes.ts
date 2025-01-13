

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getCurrentUser,
  getBalances,
  getFriends,
  inviteFriend,
  addOrEditExpense,
  getExpensesWithFriend,
  updateUserDetails,
} from '../controllers/user.controller';

const router = Router();

// Apply authentication middleware to all user routes
router.use(authenticateToken);

// User routes
router.get('/me', getCurrentUser);
router.get('/balances', getBalances);
router.get('/friends', getFriends);
router.post('/friends/invite', inviteFriend);
router.post('/expenses', addOrEditExpense);
router.get('/friends/:friendId/expenses', getExpensesWithFriend);
router.patch('/profile', updateUserDetails);

export const userRouter = router;