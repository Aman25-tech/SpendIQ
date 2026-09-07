const mongoose = require('mongoose');



const CATEGORIES = [
  'Food',
  'Travel',
  'Entertainment',
  'Shopping',
  'Education',
  'Bills',
  'Health',
  'Other',
];

const expenseSchema = new mongoose.Schema(
  {


    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);



expenseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Expense', expenseSchema);
