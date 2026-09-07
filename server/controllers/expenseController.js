const Expense = require('../models/Expense');




const getExpenses = async (req, res) => {
  try {


    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};




const createExpense = async (req, res) => {
  try {
    const { title, amount, category, description, date } = req.body;



    const expense = await Expense.create({
      user: req.user._id,
      title,
      amount,
      category,
      description,
      date: date || Date.now(),
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
};




const updateExpense = async (req, res) => {
  try {


    let expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission',
      });
    }

    const { title, amount, category, description, date } = req.body;



    expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount, category, description, date },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
};




const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found or you do not have permission',
      });
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense };
