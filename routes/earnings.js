const express = require('express');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const { buildEarningsPipeline } = require('../utils/databaseUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// Get monthly earnings
router.get('/monthly', authenticateToken, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const pipeline = buildEarningsPipeline(req.userId, startDate, endDate);
  const monthlyEarnings = await Session.aggregate(pipeline);
  
  sendSuccess(res, { monthlyEarnings });
}));

// Get detailed earnings for a specific month
router.get('/monthly/:year/:month', authenticateToken, asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  
  // Get all completed sessions for the specific month
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);
  
  const sessions = await Session.find({
    userId: req.userId,
    completed: true,
    amount: { $exists: true, $gt: 0 },
    date: {
      $gte: startDate.toISOString().split('T')[0],
      $lte: endDate.toISOString().split('T')[0]
    }
  }).sort({ date: 1, time: 1 }).lean();

  const totalEarnings = sessions.reduce((sum, session) => sum + (session.amount || 0), 0);
  const sessionCount = sessions.length;

  sendSuccess(res, {
    month,
    year: parseInt(year),
    totalEarnings,
    sessionCount,
    sessions
  });
}));

module.exports = router;
