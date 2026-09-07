const jwt = require('jsonwebtoken');
const User = require('../models/User');






const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};




const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      monthlyBudget: user.monthlyBudget,
    },
  });
};




const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;


    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }


    const user = await User.create({ name, email, password });


    sendTokenResponse(user, 201, res);
  } catch (error) {

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};




const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }


    const user = await User.findOne({ email }).select('+password');

    if (!user) {

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }


    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};




const getMe = async (req, res) => {

  res.status(200).json({
    success: true,
    user: req.user,
  });
};









const updateProfile = async (req, res) => {
  try {
    const { name, currency, monthlyBudget } = req.body;




    const updates = {};
    if (name !== undefined) updates.name = name;
    if (currency !== undefined) updates.currency = currency;
    if (monthlyBudget !== undefined) updates.monthlyBudget = monthlyBudget;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to update. Send name, currency, or monthlyBudget.',
      });
    }



    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error during profile update' });
  }
};

module.exports = { register, login, getMe, updateProfile };
