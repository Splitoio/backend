

// src/routes/group.routes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createGroup,
  getAllGroups,
  getAllGroupsWithBalances,
  joinGroup,
  addOrEditExpense,
} from '../controllers/group.controller';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createGroup);
router.get('/', getAllGroups);
router.get('/balances', getAllGroupsWithBalances);
router.post('/join/:groupId', joinGroup);

router.post("/:groupId/expenses", (req, res) => {

});
router.post('/:groupId/expenses', addOrEditExpense);



export const groupRouter = router;