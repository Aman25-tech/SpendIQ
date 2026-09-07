const Expense = require('../models/Expense');
const Income = require('../models/Income');
const User = require('../models/User');
const Goal = require('../models/Goal');

















const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};


const clamp = (v, min, max) => Math.min(Math.max(v, min), max);


const sumOf = (items) => items.reduce((s, it) => s + it.amount, 0);





const getMonthRange = (offset) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
};


const buildCategoryMap = (expenses) => {
  return expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});
};


const buildWeekly = (expenses, totalDaysInMonth) => {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].map((week) => ({
    week,
    amount: 0,
  }));
  expenses.forEach((exp) => {
    const day = new Date(exp.date).getDate();
    const index = Math.min(Math.floor((day - 1) / 7), 4);
    weeks[index].amount += exp.amount;
  });
  return weeks.slice(0, Math.ceil(totalDaysInMonth / 7));
};

const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;





    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const dayOfMonth = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = totalDaysInMonth - dayOfMonth;




    const [expenses, income] = await Promise.all([
      Expense.find({
        user: userId,
        date: { $gte: monthStart, $lte: monthEnd },
      }).sort({ date: 1 }),
      Income.find({
        user: userId,
        date: { $gte: monthStart, $lte: monthEnd },
      }),
    ]);


    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0
      ? parseFloat(((remaining / totalIncome) * 100).toFixed(1))
      : 0;
    const avgDailySpending = dayOfMonth > 0
      ? parseFloat((totalExpenses / dayOfMonth).toFixed(0))
      : 0;




    const categoryMap = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});


    const CATEGORY_COLORS = {
      Food: '#f97316',
      Travel: '#06b6d4',
      Entertainment: '#a855f7',
      Shopping: '#ec4899',
      Education: '#3b82f6',
      Bills: '#ef4444',
      Health: '#10b981',
      Other: '#6b7280',
    };



    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#6b7280',
        percentage: parseFloat(((value / totalExpenses) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.value - a.value);


    const highestCategory = categoryBreakdown.length > 0
      ? categoryBreakdown[0]
      : null;





    const dailyMap = {};
    expenses.forEach((exp) => {
      const key = toLocalDateKey(new Date(exp.date));
      dailyMap[key] = (dailyMap[key] || 0) + exp.amount;
    });

    const dailySpending = [];


    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(now.getFullYear(), now.getMonth(), d);
      const key = toLocalDateKey(dateObj);
      dailySpending.push({
        date: key,
        label: `${d}/${now.getMonth() + 1}`,
        amount: dailyMap[key] || 0,
      });
    }



    const weeklySpending = [
      { week: 'Week 1', amount: 0 },
      { week: 'Week 2', amount: 0 },
      { week: 'Week 3', amount: 0 },
      { week: 'Week 4', amount: 0 },
      { week: 'Week 5', amount: 0 },
    ];

    expenses.forEach((exp) => {
      const expDay = new Date(exp.date).getDate();
      const weekIndex = Math.min(Math.floor((expDay - 1) / 7), 4);
      weeklySpending[weekIndex].amount += exp.amount;
    });





    const weeksInMonth = Math.ceil(totalDaysInMonth / 7);
    const activeWeeks = weeklySpending.slice(0, weeksInMonth);


    const monthlyBudget = req.user.monthlyBudget || 0;
    const budgetUsedPercent = monthlyBudget > 0
      ? parseFloat(((totalExpenses / monthlyBudget) * 100).toFixed(1))
      : 0;
    const budgetStatus = budgetUsedPercent > 100
      ? 'exceeded'
      : budgetUsedPercent > 80
        ? 'warning'
        : 'on_track';



    const midpoint = Math.floor(dayOfMonth / 2);
    let firstHalf = 0;
    let secondHalf = 0;
    expenses.forEach((exp) => {
      const d = new Date(exp.date).getDate();
      if (d <= midpoint) firstHalf += exp.amount;
      else secondHalf += exp.amount;
    });

    const spendingTrend = secondHalf > firstHalf
      ? 'increasing'
      : secondHalf < firstHalf
        ? 'decreasing'
        : 'stable';


    res.status(200).json({
      success: true,
      data: {

        summary: {
          totalIncome,
          totalExpenses,
          remaining,
          savingsRate,
          avgDailySpending,
          transactionCount: expenses.length,
          daysElapsed: dayOfMonth,
          daysRemaining,
        },


        categoryBreakdown,
        highestCategory,


        dailySpending,


        weeklySpending: activeWeeks,


        budget: {
          monthlyBudget,
          spent: totalExpenses,
          remaining: Math.max(monthlyBudget - totalExpenses, 0),
          usedPercent: budgetUsedPercent,
          status: budgetStatus,
        },


        spendingTrend,


        recentExpenses: expenses.slice(-5).reverse(),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate analytics',
    });
  }
};













const getPerformanceAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();



    const [currentExpenses, prevExpenses, currentIncome, goals] = await Promise.all([
      Expense.find({ user: userId, date: { $gte: getMonthRange(0).start, $lte: getMonthRange(0).end } }),
      Expense.find({ user: userId, date: { $gte: getMonthRange(-1).start, $lte: getMonthRange(-1).end } }),
      Income.find({ user: userId, date: { $gte: getMonthRange(0).start, $lte: getMonthRange(0).end } }),
      Goal.find({ user: userId, status: { $in: ['active', 'completed'] } }),
    ]);

    const currentTotal = sumOf(currentExpenses);
    const prevTotal = sumOf(prevExpenses);
    const incomeTotal = sumOf(currentIncome);
    const transactionCount = currentExpenses.length;
    const remaining = incomeTotal - currentTotal;


    const monthlyGrowth = prevTotal > 0
      ? parseFloat((((currentTotal - prevTotal) / prevTotal) * 100).toFixed(1))
      : null;



    const dayKeyOffset = (offset) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      return toLocalDateKey(d);
    };
    const last7StartKey = dayKeyOffset(-6);
    const prev7StartKey = dayKeyOffset(-13);
    let last7 = 0;
    let prev7 = 0;
    currentExpenses.forEach((exp) => {
      const key = toLocalDateKey(new Date(exp.date));
      if (key >= last7StartKey) last7 += exp.amount;
      else if (key >= prev7StartKey) prev7 += exp.amount;
    });
    const weeklyGrowth = prev7 > 0
      ? parseFloat((((last7 - prev7) / prev7) * 100).toFixed(1))
      : null;


    const avgTransaction = transactionCount > 0
      ? parseFloat((currentTotal / transactionCount).toFixed(0))
      : 0;

    const frequencyPerDay = parseFloat((transactionCount / totalDaysInMonth).toFixed(2));


    const savingsRate = incomeTotal > 0
      ? parseFloat((((incomeTotal - currentTotal) / incomeTotal) * 100).toFixed(1))
      : 0;


    const monthlyBudget = req.user.monthlyBudget || 0;
    const budgetUsed = monthlyBudget > 0
      ? parseFloat((currentTotal / monthlyBudget * 100).toFixed(1))
      : null;
    const budgetStatus = budgetUsed === null
      ? 'not_set'
      : budgetUsed > 100
        ? 'exceeded'
        : budgetUsed > 80
          ? 'warning'
          : 'on_track';




    const catMap = buildCategoryMap(currentExpenses);
    const categoryCount = Object.keys(catMap).length;
    let hhi = 0;
    Object.values(catMap).forEach((amount) => {
      const share = currentTotal > 0 ? amount / currentTotal : 0;
      hhi += share * share;
    });
    const concentration = categoryCount > 1
      ? parseFloat(((1 - hhi) / (1 - 1 / categoryCount) * 100).toFixed(1))
      : categoryCount === 1
        ? 0
        : null;


    let weekendSpend = 0;
    let weekdaySpend = 0;
    currentExpenses.forEach((exp) => {
      const dow = new Date(exp.date).getDay();
      if (dow === 0 || dow === 6) weekendSpend += exp.amount;
      else weekdaySpend += exp.amount;
    });
    const weekendShare = currentTotal > 0
      ? parseFloat((weekendSpend / currentTotal * 100).toFixed(1))
      : 0;


    const midpoint = Math.floor(totalDaysInMonth / 2);
    let firstHalf = 0;
    let secondHalf = 0;
    currentExpenses.forEach((exp) => {
      const day = new Date(exp.date).getDate();
      if (day <= midpoint) firstHalf += exp.amount;
      else secondHalf += exp.amount;
    });
    const halfTrend = secondHalf > firstHalf
      ? 'increasing'
      : secondHalf < firstHalf
        ? 'decreasing'
        : 'stable';


    const prevCatMap = buildCategoryMap(prevExpenses);
    const allCategories = [...new Set([...Object.keys(catMap), ...Object.keys(prevCatMap)])];
    const categoryGrowth = allCategories
      .map((name) => {
        const thisMonthVal = catMap[name] || 0;
        const lastMonthVal = prevCatMap[name] || 0;
        let changePct = 0;
        if (lastMonthVal > 0) {
          changePct = parseFloat((((thisMonthVal - lastMonthVal) / lastMonthVal) * 100).toFixed(1));
        } else if (thisMonthVal > 0) {
          changePct = null;
        }
        return { name, thisMonth: thisMonthVal, lastMonth: lastMonthVal, changePct };
      })
      .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0));


    const currentWeeks = buildWeekly(currentExpenses, totalDaysInMonth);
    const prevWeeks = buildWeekly(prevExpenses, totalDaysInMonth);
    const weeklyComparison = currentWeeks.map((w, i) => ({
      week: w.week,
      currentMonth: w.amount,
      lastMonth: prevWeeks[i] ? prevWeeks[i].amount : 0,
    }));





    const budgetScore = budgetUsed === null
      ? 50
      : clamp(100 - Math.max(0, budgetUsed - 80) * 1.5, 0, 100);


    const savingsScore = incomeTotal > 0
      ? clamp((savingsRate / 20) * 100, 0, 100)
      : 0;



    let consistencyScore = 50;
    if (currentWeeks.length >= 2) {
      const amounts = currentWeeks.map((w) => w.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      if (mean > 0) {
        const variance = amounts.reduce((acc, v) => acc + (v - mean) ** 2, 0) / amounts.length;
        const cv = Math.sqrt(variance) / mean;
        consistencyScore = clamp(100 - cv * 100, 0, 100);
      }
    }


    const growthScore = monthlyGrowth === null
      ? 60
      : clamp(100 - Math.max(0, monthlyGrowth) * 2, 0, 100);




    const goalProgress =
      goals.length > 0
        ? goals.reduce((acc, goal) => {
            const progress = goal.targetAmount > 0 ? goal.savedAmount / goal.targetAmount : 0;
            return acc + Math.min(progress, 1);
          }, 0) / goals.length
        : null;
    const goalsScore = goalProgress === null
      ? 50
      : clamp(goalProgress * 100, 0, 100);

    const score = Math.round(
      budgetScore * 0.30 +
      savingsScore * 0.25 +
      consistencyScore * 0.20 +
      growthScore * 0.15 +
      goalsScore * 0.10
    );

    const scoreLabel = score >= 80
      ? 'Excellent'
      : score >= 60
        ? 'Good'
        : score >= 40
          ? 'Fair'
          : 'Needs Improvement';

    res.status(200).json({
      success: true,
      data: {
        period: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          monthName: now.toLocaleString('en', { month: 'long' }),
        },
        score: {
          total: score,
          label: scoreLabel,
          components: [
            { key: 'budget', name: 'Budget Adherence', weight: 30, value: Math.round(budgetScore) },
            { key: 'savings', name: 'Savings Rate', weight: 25, value: Math.round(savingsScore) },
            { key: 'consistency', name: 'Spending Consistency', weight: 20, value: Math.round(consistencyScore) },
            { key: 'growth', name: 'Spending Growth', weight: 15, value: Math.round(growthScore) },
            { key: 'goals', name: 'Goal Progress', weight: 10, value: Math.round(goalsScore) },
          ],
        },
        metrics: {
          monthlyGrowth,
          weeklyGrowth,
          avgTransaction,
          frequencyPerDay,
          savingsRate,
          budgetUsed,
          budgetStatus,
          budget: monthlyBudget,
          concentration,
          weekendSpend,
          weekdaySpend,
          weekendShare,
          firstHalf,
          secondHalf,
          halfTrend,
          goalCount: goals.length,
          goalProgress: goalProgress === null
            ? null
            : parseFloat((goalProgress * 100).toFixed(1)),
        },
        categoryGrowth,
        weeklyComparison,
      },
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate performance analytics',
    });
  }
};








const getBehaviorAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    const current = getMonthRange(0);
    const previous = getMonthRange(-1);

    const [currentExpenses, prevExpenses] = await Promise.all([
      Expense.find({ user: userId, date: { $gte: current.start, $lte: current.end } }),
      Expense.find({ user: userId, date: { $gte: previous.start, $lte: previous.end } }),
    ]);

    const currentTotal = sumOf(currentExpenses);
    const prevTotal = sumOf(prevExpenses);
    const transactionCount = currentExpenses.length;
    const avgTransaction = transactionCount > 0 ? currentTotal / transactionCount : 0;

    const catMap = buildCategoryMap(currentExpenses);
    const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;
    const shareOf = (name) => (currentTotal > 0 ? (catMap[name] || 0) / currentTotal : 0);
    const pct = (v) => Math.round(v * 100);


    let monthlyGrowth = null;
    if (prevTotal > 0) {
      monthlyGrowth = ((currentTotal - prevTotal) / prevTotal) * 100;
    }


    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const midpoint = Math.floor(totalDaysInMonth / 2);
    let firstHalf = 0;
    let secondHalf = 0;
    currentExpenses.forEach((e) => {
      const day = new Date(e.date).getDate();
      if (day <= midpoint) firstHalf += e.amount;
      else secondHalf += e.amount;
    });
    const halfTrend =
      secondHalf > firstHalf ? 'increasing' : secondHalf < firstHalf ? 'decreasing' : 'stable';


    let weekendSpend = 0;
    currentExpenses.forEach((e) => {
      const dow = new Date(e.date).getDay();
      if (dow === 0 || dow === 6) weekendSpend += e.amount;
    });
    const weekendShare = currentTotal > 0 ? weekendSpend / currentTotal : 0;



    const isWeekend = (e) => {
      const dow = new Date(e.date).getDay();
      return dow === 0 || dow === 6;
    };
    const smallThreshold = avgTransaction > 0 ? avgTransaction * 0.3 : 0;
    const largeThreshold = avgTransaction * 2.5;

    const foodTxns = currentExpenses.filter((e) => e.category === 'Food');
    const entTxns = currentExpenses.filter((e) => e.category === 'Entertainment');
    const travelTxns = currentExpenses.filter((e) => e.category === 'Travel');
    const discretionaryTxns = currentExpenses.filter((e) =>
      ['Food', 'Travel', 'Entertainment', 'Shopping'].includes(e.category)
    );
    const smallTxns = currentExpenses.filter((e) => e.amount <= smallThreshold);
    const largeTxns = currentExpenses.filter((e) => e.amount >= largeThreshold);
    const weekendTxns = currentExpenses.filter(isWeekend);

    const patterns = [];
    const push = (key, label, severity, description, txns = [], data = {}) =>
      patterns.push({
        key,
        label,
        severity,
        description,
        transactionIds: txns.map((t) => t._id),
        data,
      });


    const foodShare = shareOf('Food');
    if (foodShare >= 0.35) {
      push(
        'food-heavy',
        'Food-heavy spending',
        foodShare >= 0.45 ? 'high' : 'medium',
        `${pct(foodShare)}% of this month's spending (${fmt(catMap.Food || 0)} of ${fmt(currentTotal)}) went to Food.`,
        foodTxns,
        { share: pct(foodShare), amount: catMap.Food || 0, total: currentTotal }
      );
    }


    const entShare = shareOf('Entertainment');
    if (entShare >= 0.2) {
      push(
        'ent-heavy',
        'Entertainment-heavy spending',
        entShare >= 0.28 ? 'high' : 'medium',
        `${pct(entShare)}% of this month's spending (${fmt(catMap.Entertainment || 0)}) went to Entertainment.`,
        entTxns,
        { share: pct(entShare), amount: catMap.Entertainment || 0, total: currentTotal }
      );
    }


    const travelShare = shareOf('Travel');
    if (travelShare >= 0.25) {
      push(
        'travel-heavy',
        'Travel-heavy spending',
        travelShare >= 0.35 ? 'high' : 'medium',
        `${pct(travelShare)}% of this month's spending (${fmt(catMap.Travel || 0)}) went to Travel.`,
        travelTxns,
        { share: pct(travelShare), amount: catMap.Travel || 0, total: currentTotal }
      );
    }


    const discretionary =
      (catMap.Food || 0) + (catMap.Travel || 0) + (catMap.Entertainment || 0) + (catMap.Shopping || 0);
    const discretionaryShare = currentTotal > 0 ? discretionary / currentTotal : 0;
    if (discretionaryShare >= 0.6) {
      push(
        'discretionary',
        'High discretionary spending',
        discretionaryShare >= 0.75 ? 'high' : 'medium',
        `${pct(discretionaryShare)}% of spending (${fmt(discretionary)}) went to non-essential categories (Food, Travel, Entertainment, Shopping).`,
        discretionaryTxns,
        { share: pct(discretionaryShare), amount: discretionary, total: currentTotal }
      );
    }


    if (monthlyGrowth !== null && monthlyGrowth > 15) {
      push(
        'increasing-trend',
        'Increasing spending trend',
        monthlyGrowth > 30 ? 'high' : 'medium',
        `Spending is up ${monthlyGrowth.toFixed(1)}% vs last month (${fmt(prevTotal)} → ${fmt(currentTotal)}).`,
        currentExpenses,
        { growth: Math.round(monthlyGrowth), prevTotal, currentTotal }
      );
    } else if (halfTrend === 'increasing') {
      push(
        'increasing-trend',
        'Increasing spending trend',
        'medium',
        `You spent more in the second half of the month (${fmt(secondHalf)}) than the first half (${fmt(firstHalf)}).`,
        currentExpenses,
        { firstHalf, secondHalf }
      );
    }


    const smallCount = smallTxns.length;
    const smallShare = transactionCount > 0 ? smallCount / transactionCount : 0;
    if (transactionCount >= 5 && smallShare >= 0.35) {
      push(
        'small-transactions',
        'Repeated small transactions',
        'medium',
        `${smallCount} of ${transactionCount} transactions (${pct(smallShare)}%) were at or below ${fmt(smallThreshold)} — many small frequent spends add up quickly.`,
        smallTxns,
        { count: smallCount, threshold: smallThreshold, total: transactionCount }
      );
    }


    const largeCount = largeTxns.length;
    if (largeCount >= 1) {
      push(
        'large-transactions',
        'Large unusual transactions',
        largeCount >= 2 ? 'high' : 'medium',
        `${largeCount} transaction(s) were more than 2.5× your average transaction of ${fmt(avgTransaction)} (threshold ${fmt(largeThreshold)}).`,
        largeTxns,
        { count: largeCount, threshold: largeThreshold, avg: avgTransaction }
      );
    }


    if (weekendShare >= 0.35) {
      push(
        'weekend-heavy',
        'Weekend-heavy spending',
        weekendShare >= 0.45 ? 'high' : 'medium',
        `${pct(weekendShare)}% of spending (${fmt(weekendSpend)}) happened on weekends.`,
        weekendTxns,
        { share: pct(weekendShare), amount: weekendSpend, total: currentTotal }
      );
    }

    const severityRank = { high: 3, medium: 2, low: 1 };
    patterns.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

    res.status(200).json({
      success: true,
      data: {
        period: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          monthName: now.toLocaleString('en', { month: 'long' }),
        },
        detectedCount: patterns.length,
        transactionCount,
        totalSpent: currentTotal,
        avgTransaction,
        monthlyGrowth,
        patterns,
      },
    });
  } catch (error) {
    console.error('Behavioural analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate behavioural analytics',
    });
  }
};





















const buildMonthsSnapshot = async (userId) => {
  const offsets = [0, -1, -2];
  return Promise.all(
    offsets.map(async (offset) => {
      const range = getMonthRange(offset);
      const [expenses, incomes] = await Promise.all([
        Expense.find({ user: userId, date: { $gte: range.start, $lte: range.end } }),
        Income.find({ user: userId, date: { $gte: range.start, $lte: range.end } }),
      ]);
      return {
        offset,
        year: range.start.getFullYear(),
        month: range.start.getMonth() + 1,
        expenses: expenses.map((e) => ({
          amount: e.amount,
          category: e.category,
          date: toLocalDateKey(new Date(e.date)),
        })),
        incomes: incomes.map((i) => ({
          amount: i.amount,
          date: toLocalDateKey(new Date(i.date)),
        })),
      };
    })
  );
};

const getAiInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    const months = await buildMonthsSnapshot(userId);

    const payload = {
      currency: req.user.currency || 'INR',
      monthlyBudget: req.user.monthlyBudget || 0,
      now: toLocalDateKey(new Date()),
      months,
    };

    const aiUrl = process.env.AI_SERVER_URL || 'http://localhost:5020/analyze';
    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => '');
      console.error(`AI service responded ${aiRes.status}: ${body}`);
      return res.status(502).json({
        success: false,
        message: `AI service returned ${aiRes.status}. Make sure it's running on port 5020.`,
      });
    }

    const aiData = await aiRes.json();
    res.status(200).json({ success: true, data: aiData });
  } catch (error) {
    console.error('AI insights proxy error:', error.message);
    res.status(502).json({
      success: false,
      message:
        'AI insights service unavailable. Start it with: cd ../ai-server && python server.py',
    });
  }
};






const getFuturePlan = async (req, res) => {
  try {
    const months = await buildMonthsSnapshot(req.user._id);

    const payload = {
      currency: req.user.currency || 'INR',
      monthlyBudget: req.user.monthlyBudget || 0,
      months,
    };

    const aiUrl = process.env.AI_SERVER_URL || 'http://localhost:5020/forecast';
    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => '');
      console.error(`Forecast service responded ${aiRes.status}: ${body}`);
      return res.status(502).json({
        success: false,
        message: `Forecast service returned ${aiRes.status}. Make sure it's running on port 5020.`,
      });
    }

    const forecastData = await aiRes.json();
    res.status(200).json({ success: true, data: forecastData });
  } catch (error) {
    console.error('Future plan proxy error:', error.message);
    res.status(502).json({
      success: false,
      message:
        'AI insights service unavailable. Start it with: cd ../ai-server && python server.py',
    });
  }
};

const getSpendingSegments = async (req, res) => {
  try {
    const userId = req.user._id;
    const months = await buildMonthsSnapshot(userId);

    const payload = {
      currency: req.user.currency || 'INR',
      monthlyBudget: req.user.monthlyBudget || 0,
      now: toLocalDateKey(new Date()),
      months,
    };

    const aiUrl = process.env.AI_SEGMENT_URL || 'http://localhost:5020/segment';
    const aiRes = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => '');
      console.error(`Segment service responded ${aiRes.status}: ${body}`);
      return res.status(502).json({
        success: false,
        message: `Segment service returned ${aiRes.status}. Make sure it's running on port 5020.`,
      });
    }

    const segData = await aiRes.json();
    res.status(200).json({ success: true, data: segData });
  } catch (error) {
    console.error('Segments proxy error:', error.message);
    res.status(502).json({
      success: false,
      message:
        'AI insights service unavailable. Start it with: cd ../ai-server && python server.py',
    });
  }
};

module.exports = { getDashboardAnalytics, getPerformanceAnalytics, getBehaviorAnalytics, getAiInsights, getFuturePlan, getSpendingSegments };
