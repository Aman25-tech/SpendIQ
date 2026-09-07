const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  getPerformanceAnalytics,
  getBehaviorAnalytics,
  getAiInsights,
  getFuturePlan,
  getSpendingSegments,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/dashboard', getDashboardAnalytics);
router.get('/performance', getPerformanceAnalytics);
router.get('/behavior', getBehaviorAnalytics);
router.get('/ai-insights', getAiInsights);
router.get('/future-plan', getFuturePlan);
router.get('/segments', getSpendingSegments);

module.exports = router;
