const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Income = require('./models/Income');
const Goal = require('./models/Goal');

dotenv.config();

const seedData = async () => {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB.');


    const userEmail = 'student@spendiq.dev';
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      user = await User.create({
        name: 'Aman Gupta',
        email: userEmail,
        password: 'password123',
        monthlyBudget: 25000,
        currency: 'INR',
      });
      console.log(`👤 Created seed user: ${userEmail}`);
    } else {
      console.log(`👤 Found existing user: ${userEmail}`);
    }


    await Expense.deleteMany({ user: user._id });
    await Income.deleteMany({ user: user._id });
    await Goal.deleteMany({ user: user._id });
    console.log('🧹 Cleared previous expense, income & goal records.');







    const now = new Date();


    const onDay = (offset, day, hour) =>
      new Date(now.getFullYear(), now.getMonth() + offset, day, hour);



    const SEASONAL_MODIFIERS = {
      0:  { label: 'New Year sales',      multipliers: { Food: 1.00, Travel: 1.00, Entertainment: 1.05, Shopping: 1.30, Education: 0.80, Bills: 1.00, Health: 0.95, Other: 1.00 }, incomeBias: 1.00, freelance: true  },
      1:  { label: 'Quiet baseline',      multipliers: { Food: 1.00, Travel: 1.00, Entertainment: 1.00, Shopping: 1.00, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 0.95, freelance: true  },
      2:  { label: 'Spring break',        multipliers: { Food: 0.95, Travel: 1.25, Entertainment: 1.10, Shopping: 0.90, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.00, freelance: true  },
      3:  { label: 'Quiet baseline',      multipliers: { Food: 1.00, Travel: 1.00, Entertainment: 1.00, Shopping: 1.00, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.00, freelance: false },
      4:  { label: 'Summer trips',        multipliers: { Food: 1.00, Travel: 1.40, Entertainment: 1.10, Shopping: 0.80, Education: 0.80, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.05, freelance: true  },
      5:  { label: 'Exam season',         multipliers: { Food: 1.00, Travel: 1.20, Entertainment: 1.10, Shopping: 0.85, Education: 1.10, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 0.95, freelance: false },
      6:  { label: 'New semester',        multipliers: { Food: 1.00, Travel: 0.90, Entertainment: 1.00, Shopping: 1.05, Education: 1.40, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.10, freelance: true  },
      7:  { label: 'Festivals & books',   multipliers: { Food: 1.05, Travel: 0.95, Entertainment: 1.00, Shopping: 1.10, Education: 1.30, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.00, freelance: true  },
      8:  { label: 'Quiet baseline',      multipliers: { Food: 1.00, Travel: 1.00, Entertainment: 1.00, Shopping: 1.00, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.00, freelance: true  },
      9:  { label: 'Diwali shopping',     multipliers: { Food: 1.10, Travel: 1.00, Entertainment: 1.20, Shopping: 1.35, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.10, freelance: true  },
      10: { label: 'Pre-sale calm',       multipliers: { Food: 1.00, Travel: 1.00, Entertainment: 1.05, Shopping: 1.10, Education: 1.00, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.00, freelance: false },
      11: { label: 'Year-end spend',      multipliers: { Food: 1.15, Travel: 1.20, Entertainment: 1.20, Shopping: 1.50, Education: 0.80, Bills: 1.00, Health: 1.00, Other: 1.00 }, incomeBias: 1.15, freelance: true  },
    };



    const jitter = (offset) => 1 + (((offset * 37) % 17) - 8) / 100;

    const MONTH_PLANS = Array.from({ length: 12 }, (_, i) => {
      const offset = -i;
      const calMonth = ((now.getMonth() + offset) % 12 + 12) % 12;
      const motif = SEASONAL_MODIFIERS[calMonth];


      const catMultiplier = Object.fromEntries(
        Object.entries(motif.multipliers).map(([cat, m]) => [cat, m * jitter(offset)])
      );

      const income = [
        { title: 'Monthly Allowance from Family', amount: Math.round(20000 * motif.incomeBias * jitter(offset)), source: 'Gift', description: 'Monthly budget sent by parents', day: 1, hour: 9 },
        { title: 'College Lab Assistant Stipend', amount: Math.round(3500 * jitter(offset) * (motif.incomeBias >= 1 ? 1.1 : 0.95)), source: 'Salary', description: 'Monthly stipend for lab sessions', day: 6, hour: 10 },
        motif.freelance
          ? { title: 'Freelance Web Design Project', amount: Math.round(6500 * jitter(offset * 3)), source: 'Freelance', description: 'Client project for the month', day: 18, hour: 16 }
          : { title: 'Festival Gift from Relatives', amount: 2000, source: 'Gift', description: 'Occasional gift money', day: 15, hour: 12 },
      ];

      return {
        offset,
        label: new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(onDay(offset, 1, 0)) + (offset === 0 ? ' (current)' : ''),
        motif: motif.label,
        catMultiplier,
        income,
      };
    });






    const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

const weekendDates = [];
for (let d = 1; d <= daysInCurrentMonth; d++) {
  const dow = new Date(currentYear, currentMonth, d).getDay();
  if (dow === 0 || dow === 6) weekendDates.push(d);
}
const weekdayDates = [];
for (let d = 1; d <= daysInCurrentMonth; d++) {
  const dow = new Date(currentYear, currentMonth, d).getDay();
  if (dow !== 0 && dow !== 6) weekdayDates.push(d);
}
const wd = (slot) => weekdayDates[slot % weekdayDates.length];
const we = (slot) => weekendDates[slot % weekendDates.length];

const SHOWCASE_EXPENSES = [
  { title: 'Broadband + Mobile Recharge', category: 'Bills', amount: 750, description: 'Airtel + Jio monthly renewal', day: wd(0), hour: 9 },
  { title: 'Morning Chai & Biscuit', category: 'Food', amount: 40, description: 'Canteen run on the way to class', day: wd(1), hour: 9 },
  { title: 'Metro Smartcard Top-up', category: 'Travel', amount: 30, description: 'Single ride to campus', day: wd(2), hour: 8 },
  { title: 'Canteen Samosa', category: 'Food', amount: 25, description: 'Break snack', day: wd(3), hour: 12 },
  { title: 'Call Credit Recharge', category: 'Other', amount: 100, description: 'Prepaid top-up', day: wd(4), hour: 10 },
  { title: 'Weekend Trekking Trip', category: 'Travel', amount: 2300, description: 'One-day trek with friends', day: we(0), hour: 8 },
  { title: 'Swiggy Biryani Party', category: 'Food', amount: 1150, description: 'Hostel dinner treat', day: we(0), hour: 20 },
  { title: 'Bus to City Library', category: 'Travel', amount: 50, description: 'Library study session', day: wd(5), hour: 15 },
  { title: 'Mini Golf with Friends', category: 'Entertainment', amount: 1200, description: 'Sunday activity', day: we(1), hour: 15 },
  { title: 'Dominos Feast', category: 'Food', amount: 980, description: 'Late-night movie combo', day: we(1), hour: 21 },
  { title: 'Cold Coffee', category: 'Food', amount: 110, description: 'Cafe study break', day: wd(6), hour: 17 },
  { title: 'Notebooks & Pens', category: 'Education', amount: 80, description: 'Stationery restock', day: wd(7), hour: 11 },
  { title: 'Street Golgappa', category: 'Food', amount: 60, description: 'Evening street snack', day: wd(8), hour: 18 },
  { title: 'Secondhand Novel', category: 'Other', amount: 110, description: 'Read during commute', day: wd(9), hour: 13 },
  { title: 'Monthly Grocery Run', category: 'Food', amount: 1800, description: 'Staples + snacks restock', day: we(2), hour: 11 },
  { title: 'Family Dinner Treat', category: 'Food', amount: 1100, description: 'Weekend family outing', day: we(3), hour: 20 },
  { title: 'Pharmacy - Bandaid & Ointment', category: 'Health', amount: 90, description: 'Small first-aid buy', day: wd(10), hour: 10 },
  { title: 'Ice-Cream Day', category: 'Food', amount: 90, description: 'Cone after dinner', day: wd(11), hour: 21 },
  { title: 'Phone Screen Guard', category: 'Shopping', amount: 115, description: 'Tempered glass', day: wd(12), hour: 14 },
  { title: 'Spotify + Gaana Subscription', category: 'Entertainment', amount: 149, description: 'Music plans', day: wd(13), hour: 9 },
  { title: 'Sandwich & Juice', category: 'Food', amount: 210, description: 'Quick lunch between labs', day: wd(14), hour: 13 },
  { title: 'Ramen Cravings', category: 'Food', amount: 540, description: 'New ramen place', day: wd(15), hour: 19 },
  { title: 'Burger & Fries', category: 'Food', amount: 320, description: 'Fast-food dinner', day: wd(16), hour: 20 },
  { title: 'Week Canteen Snacks', category: 'Food', amount: 1000, description: 'Snack card top-up', day: wd(17), hour: 12 },
  { title: 'Cloud Backpack', category: 'Shopping', amount: 1400, description: 'Laptop carry bag', day: wd(18), hour: 16 },
  { title: 'Netflix Premium Share', category: 'Entertainment', amount: 220, description: 'Monthly split with friends', day: wd(19), hour: 9 },
  { title: 'Vitamins Restock', category: 'Health', amount: 180, description: 'Monthly supplements', day: wd(20), hour: 10 },
  { title: 'Kindle Book Pack', category: 'Education', amount: 420, description: 'course reference e-books', day: wd(21), hour: 12 },
  { title: 'Concert Early-Bird Ticket', category: 'Entertainment', amount: 900, description: 'Band live show', day: wd(22), hour: 11 },
  { title: 'Indie Film Night', category: 'Entertainment', amount: 450, description: 'Cinema with hostel friends', day: wd(23), hour: 19 },
  { title: 'Gaming Lounge Session', category: 'Entertainment', amount: 500, description: '2 hours FIFA', day: wd(24), hour: 17 },
];

const EXPENSE_PROFILES = [

      { title: 'Wi-Fi Broadband Recharge', category: 'Bills', base: 799, description: 'Airtel Xtream monthly plan' },
      { title: 'Mobile Postpaid Recharge', category: 'Bills', base: 499, description: 'Jio plan renewal' },
      { title: 'PG Electricity Bill Share', category: 'Bills', base: 650, description: 'Split evenly with roommates' },
      { title: 'Electricity Bill - Hostel', category: 'Bills', base: 950, description: 'Hostel power share' },

      { title: 'Morning Chai & Samosa', category: 'Food', base: 60, description: 'Breakfast at college canteen' },
      { title: 'Swiggy - Biryani Combo', category: 'Food', base: 380, description: 'Dinner with hostel friends' },
      { title: 'Monthly Groceries', category: 'Food', base: 900, description: 'Staples restock at local store' },
      { title: 'Zomato - Pizza Party', category: 'Food', base: 890, description: 'Weekend movie night treat' },
      { title: 'College Canteen Tea & Snacks', category: 'Food', base: 140, description: 'Evening snacks with project team' },
      { title: 'Zomato - Sushi Box', category: 'Food', base: 540, description: 'Japanese lunch craving' },
      { title: 'Starbucks Iced Coffee', category: 'Food', base: 340, description: 'Study session at cafe' },
      { title: 'Dominos Burger Pizza & Coke', category: 'Food', base: 460, description: 'Late night study meal' },
      { title: 'Subway Sandwich & Juice', category: 'Food', base: 320, description: 'Quick lunch between lectures' },
      { title: 'Zepto - Groceries Restock', category: 'Food', base: 700, description: 'Milk, bread & snacks restock' },

      { title: 'Metro Smart Card Recharge', category: 'Travel', base: 500, description: '50 trips monthly pass' },
      { title: 'Uber Pool to City Campus', category: 'Travel', base: 180, description: 'Morning rush hour travel' },
      { title: 'Ola Cab to Shopping Mall', category: 'Travel', base: 210, description: 'Shared ride' },
      { title: 'Auto Fare to College', category: 'Travel', base: 200, description: 'Raining day ride' },

      { title: 'Spotify Premium Subscription', category: 'Entertainment', base: 119, description: 'Student monthly plan' },
      { title: 'PVR Movie Ticket & Popcorn', category: 'Entertainment', base: 550, description: 'Blockbuster movie' },
      { title: 'Netflix Premium Share', category: 'Entertainment', base: 220, description: 'Split with 4 friends' },
      { title: 'Gaming Lounge Session', category: 'Entertainment', base: 300, description: '2 hours FIFA with friends' },

      { title: 'Myntra - Denim Jeans & T-Shirt', category: 'Shopping', base: 2190, description: 'End of season sale' },
      { title: 'Amazon - Laptop Stand & Mouse', category: 'Shopping', base: 1100, description: 'Ergonomic workspace setup' },
      { title: 'Sneakers from Flipkart', category: 'Shopping', base: 1750, description: 'Casual daily wear shoes' },
      { title: 'Nike Duffle Bag', category: 'Shopping', base: 1299, description: 'Gym & travel backpack' },
      { title: 'Backup Power Bank', category: 'Shopping', base: 1499, description: '10000mAh for classes' },

      { title: 'Semester Exam Fee', category: 'Education', base: 1200, description: 'Paid online via portal' },
      { title: 'Data Structures Textbook', category: 'Education', base: 650, description: 'Bought second-hand edition' },
      { title: 'Udemy Full-Stack Web Dev Course', category: 'Education', base: 499, description: 'Flash sale deal' },
      { title: 'Lab Record Notebooks & Stationery', category: 'Education', base: 230, description: 'Practical record sheets' },

      { title: 'Pharmacy - Painkillers & Bandages', category: 'Health', base: 220, description: 'First aid box refill' },
      { title: 'Multivitamin Supplements', category: 'Health', base: 580, description: 'Monthly health essentials' },
      { title: 'Gym Membership Monthly', category: 'Health', base: 800, description: 'College gym subscription' },

      { title: 'Google One Storage Plan', category: 'Other', base: 130, description: 'Cloud backup for photos' },
      { title: 'Misc Cash (Unexpected)', category: 'Other', base: 250, description: 'Unplanned small spend' },
    ];


    const allIncome = [];
    const allExpenses = [];
    const monthTotals = [];

    for (const plan of MONTH_PLANS) {
      const daysInMonth = new Date(
        now.getFullYear(), now.getMonth() + plan.offset + 1, 0
      ).getDate();

      plan.income.forEach((inc) => {
        allIncome.push({
          user: user._id,
          title: inc.title,
          amount: inc.amount,
          source: inc.source,
          description: inc.description,
          date: onDay(plan.offset, inc.day, inc.hour),
        });
      });

      let monthTotal = 0;
      if (plan.offset === 0) {
        SHOWCASE_EXPENSES.forEach((s) => {
          monthTotal += s.amount;
          allExpenses.push({
            user: user._id,
            title: s.title,
            amount: s.amount,
            category: s.category,
            description: s.description,
            date: onDay(0, s.day, s.hour),
          });
        });
      } else {
        EXPENSE_PROFILES.forEach((profile, i) => {
          const multiplier = plan.catMultiplier[profile.category] || 1;
          const amount = Math.round(profile.base * multiplier);
          monthTotal += amount;

          const day = ((i * 7) % daysInMonth) + 1;
          const hour = 9 + (i % 12);

          allExpenses.push({
            user: user._id,
            title: profile.title,
            amount,
            category: profile.category,
            description: profile.description,
            date: onDay(plan.offset, day, hour),
          });
        });
      }

      monthTotals.push({
        label: plan.label,
        motif: plan.motif,
        count: plan.offset === 0 ? SHOWCASE_EXPENSES.length : EXPENSE_PROFILES.length,
        total: monthTotal,
      });
    }

    await Income.insertMany(allIncome);
    await Expense.insertMany(allExpenses);




    const goals = [
      {
        user: user._id,
        title: 'Emergency Fund',
        targetAmount: 50000,
        savedAmount: 12000,
      },
      {
        user: user._id,
        title: 'New Laptop',
        targetAmount: 60000,
        savedAmount: 0,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 6, 1),
      },
      {
        user: user._id,
        title: 'Trip to Goa',
        targetAmount: 25000,
        savedAmount: 25000,
        status: 'completed',
        completedAt: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      },
    ];
    await Goal.insertMany(goals);


    console.log('\n==================================================');
    console.log('🎉 SEED DATA CREATED SUCCESSFULLY!');
    console.log('==================================================');
    console.log(`📧 Test Email:    student@spendiq.dev`);
    console.log(`🔑 Test Password: password123`);
    console.log(`💰 Incomes:       ${allIncome.length} records (${MONTH_PLANS.length} months)`);
    monthTotals.forEach((m) => {
      console.log(`💸 ${m.label.padEnd(15)}: ${m.motif.padEnd(18)} ₹${m.total.toLocaleString('en-IN')} (${m.count} records)`);
    });
    console.log(`🔢 TOTAL:         ${allExpenses.length} expenses across ${MONTH_PLANS.length} months`);
    console.log(`🎯 Goals:         ${goals.length} saving goals (Emergency Fund, New Laptop, Trip to Goa)`);
    console.log('==================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();