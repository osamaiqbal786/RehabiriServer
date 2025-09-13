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
  
  console.log('Earnings request for userId:', req.userId);
  console.log('Date range:', { startDate, endDate });
  
  // First, let's check what sessions exist for this user
  const allSessions = await Session.find({ userId: req.userId }).lean();
  console.log('Total sessions for user:', allSessions.length);
  
  const completedSessions = await Session.find({ userId: req.userId, completed: true }).lean();
  console.log('Completed sessions:', completedSessions.length);
  
  const sessionsWithAmount = await Session.find({ 
    userId: req.userId, 
    completed: true, 
    amount: { $exists: true, $ne: null, $gt: 0 } 
  }).lean();
  console.log('Completed sessions with amount > 0:', sessionsWithAmount.length);
  
  if (sessionsWithAmount.length > 0) {
    console.log('Sample session with amount:', sessionsWithAmount[0]);
  } else {
    console.log('No sessions with amounts found. Checking all completed sessions...');
    if (completedSessions.length > 0) {
      console.log('Sample completed session (no amount):', completedSessions[0]);
    }
  }
  
  console.log('Converting userId to ObjectId:', req.userId, '->', new mongoose.Types.ObjectId(req.userId));
  const pipeline = buildEarningsPipeline(req.userId, startDate, endDate);
  console.log('Pipeline:', JSON.stringify(pipeline, null, 2));
  
  // Test the pipeline step by step
  console.log('Testing pipeline steps...');
  
  // Step 1: Match stage
  const matchResult = await Session.aggregate([pipeline[0]]);
  console.log('Match stage result count:', matchResult.length);
  
  // Step 2: Add fields stage
  const addFieldsResult = await Session.aggregate([pipeline[0], pipeline[1]]);
  console.log('Add fields stage result count:', addFieldsResult.length);
  if (addFieldsResult.length > 0) {
    console.log('Sample after add fields:', addFieldsResult[0]);
  }
  
  const monthlyEarnings = await Session.aggregate(pipeline);
  console.log('Monthly earnings result:', monthlyEarnings);
  
  sendSuccess(res, { monthlyEarnings });
}));

// Get detailed earnings for a specific month
router.get('/monthly/:year/:month', authenticateToken, asyncHandler(async (req, res) => {
  const { year, month } = req.params;
  
  console.log('Earnings detail request for userId:', req.userId, 'year:', year, 'month:', month);
  
  // Get all completed sessions for the specific month
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  console.log('Date range:', { startDateStr, endDateStr });
  
  const sessions = await Session.find({
    userId: new mongoose.Types.ObjectId(req.userId),
    completed: true,
    amount: { $exists: true, $ne: null, $gt: 0 },
    date: {
      $gte: startDateStr,
      $lte: endDateStr
    }
  }).sort({ date: 1, time: 1 }).lean();

  console.log('Found sessions:', sessions.length);
  console.log('Sessions:', sessions);

  const totalEarnings = sessions.reduce((sum, session) => sum + (session.amount || 0), 0);
  const sessionCount = sessions.length;

  console.log('Total earnings:', totalEarnings, 'Session count:', sessionCount);

  const responseData = {
    month,
    year: parseInt(year),
    totalEarnings,
    sessionCount,
    sessions: transformDocuments(sessions)
  };
  
  console.log('Sending response data:', responseData);
  sendSuccess(res, responseData);
}));

// Test endpoint to create a sample completed session with amount (for testing only)
router.post('/test-session', authenticateToken, asyncHandler(async (req, res) => {
  console.log('Creating test session for userId:', req.userId);
  
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
  console.log('Test session created:', testSession);
  
  sendSuccess(res, { 
    message: 'Test session created successfully',
    session: testSession 
  });
}));

module.exports = router;
