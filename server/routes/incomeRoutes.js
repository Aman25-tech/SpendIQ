const express = require('express');
const router = express.Router();
const { getIncome, createIncome, deleteIncome } = require('../controllers/incomeController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getIncome)
  .post(createIncome);

router.route('/:id')
  .delete(deleteIncome);

module.exports = router;
