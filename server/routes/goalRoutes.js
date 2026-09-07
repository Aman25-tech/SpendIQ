const express = require('express');
const router = express.Router();
const {
  getGoals,
  createGoal,
  updateGoal,
  depositToGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');


router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);


router.post('/:id/deposit', depositToGoal);

module.exports = router;