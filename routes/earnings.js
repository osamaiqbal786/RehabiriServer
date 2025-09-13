const express = require('express');
const mongoose = require('mongoose');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError, transformDocuments } = require('../utils/responseUtils');
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
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const sessions = await Session.find({
    userId: new mongoose.Types.ObjectId(req.userId),
    completed: true,
    amount: { $exists: true, $ne: null, $gt: 0 },
    date: {
      $gte: startDateStr,
      $lte: endDateStr
    }
  }).sort({ date: 1, time: 1 }).lean();

  const totalEarnings = sessions.reduce((sum, session) => sum + (session.amount || 0), 0);
  const sessionCount = sessions.length;

  const responseData = {
    month,
    year: parseInt(year),
    totalEarnings,
    sessionCount,
    sessions: transformDocuments(sessions)
  };
  
  sendSuccess(res, responseData);
}));

// Test endpoint to create a sample completed session with amount (for testing only)
router.post('/test-session', authenticateToken, asyncHandler(async (req, res) => {
  // First, get a patient for this user
  const Patient = require('../models/Patient');
  const patient = await Patient.findOne({ userId: req.userId });
  
  if (!patient) {
    return sendError(res, 'No patients found. Please create a patient first.', 400);
  }
  
  // Create a test session
  const Session = require('../models/Session');
  const testSession = new Session({
    userId: req.userId,
    patientId: patient._id,
    patientName: patient.name,
    date: new Date().toISOString().split('T')[0], // Today's date
    time: '10:00',
    notes: 'Test session for earnings',
    completed: true,
    cancelled: false,
    amount: 500 // Test amount
  });
  
  await testSession.save();
  
  sendSuccess(res, { 
    message: 'Test session created successfully',
    session: testSession 
  });
}));

module.exports = router;
