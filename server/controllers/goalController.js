const Goal = require('../models/Goal');



const withProgress = (goal) => ({
  ...goal.toObject(),
  progressPercent: goal.targetAmount > 0
    ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100)
    : 0,
});




const getGoals = async (req, res) => {
  try {
    const goals = await Goal.find({
      user: req.user._id,
      status: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: goals.length,
      data: goals.map(withProgress),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
};




const createGoal = async (req, res) => {
  try {
    const { title, targetAmount, targetDate } = req.body;

    if (!title || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Title and target amount are required',
      });
    }

    const goal = await Goal.create({
      user: req.user._id,
      title,
      targetAmount,
      targetDate: targetDate || null,
    });

    res.status(201).json({ success: true, data: withProgress(goal) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to create goal' });
  }
};




const updateGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const { title, targetAmount, targetDate, status } = req.body;
    if (title !== undefined) goal.title = title;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (targetDate !== undefined) goal.targetDate = targetDate || null;
    if (status !== undefined) goal.status = status;


    goal.completedAt = goal.savedAmount >= goal.targetAmount
      ? (goal.completedAt || new Date())
      : null;
    if (goal.savedAmount >= goal.targetAmount) goal.status = 'completed';
    else if (goal.status === 'completed') goal.status = 'active';

    await goal.save();
    res.status(200).json({ success: true, data: withProgress(goal) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Failed to update goal' });
  }
};




const depositToGoal = async (req, res) => {
  try {
    const { amount } = req.body;
    const deposit = parseFloat(amount);

    if (!deposit || deposit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be greater than 0',
      });
    }

    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }


    goal.savedAmount = Math.min(goal.savedAmount + deposit, goal.targetAmount);
    if (goal.savedAmount >= goal.targetAmount) {
      goal.status = 'completed';
      goal.completedAt = goal.completedAt || new Date();
    }

    await goal.save();
    res.status(200).json({ success: true, data: withProgress(goal) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deposit to goal' });
  }
};




const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    goal.status = 'cancelled';
    await goal.save();

    res.status(200).json({ success: true, message: 'Goal removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
};

module.exports = { getGoals, createGoal, updateGoal, depositToGoal, deleteGoal };