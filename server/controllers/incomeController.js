const Income = require('../models/Income');




const getIncome = async (req, res) => {
  try {
    const income = await Income.find({ user: req.user._id }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: income.length,
      data: income,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch income' });
  }
};




const createIncome = async (req, res) => {
  try {
    const { title, amount, source, description, date } = req.body;

    const income = await Income.create({
      user: req.user._id,
      title,
      amount,
      source,
      description,
      date: date || Date.now(),
    });

    res.status(201).json({ success: true, data: income });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to create income' });
  }
};




const deleteIncome = async (req, res) => {
  try {
    const income = await Income.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        message: 'Income record not found or you do not have permission',
      });
    }

    await income.deleteOne();
    res.status(200).json({ success: true, message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete income' });
  }
};

module.exports = { getIncome, createIncome, deleteIncome };
