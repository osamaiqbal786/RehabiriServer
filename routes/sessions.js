const express = require('express');
const Session = require('../models/Session');
const Patient = require('../models/Patient');
const { authenticateToken } = require('../middleware/auth');
const { transformDocuments, sendSuccess, sendError, sendValidationError, sendNotFoundError } = require('../utils/responseUtils');
const { validateRequiredFields, isValidObjectId, isValidDate, isValidTime } = require('../utils/validationUtils');
const { buildEarningsPipeline } = require('../utils/databaseUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();



// Get past sessions (completed/cancelled sessions + unmarked sessions before today)
router.get('/past', authenticateToken, asyncHandler(async (req, res) => {
  const { includeCancelled } = req.query;
  const today = new Date().toISOString().split('T')[0];
  
  let query = { userId: req.userId };
  
  if (includeCancelled === 'true') {
    // Include: completed sessions (any date), cancelled sessions (any date), and unmarked sessions before today
    query.$or = [
      { completed: true }, // Completed sessions (including today's completed)
      { cancelled: true }, // Cancelled sessions (including today's cancelled)
      { 
        date: { $lt: today }, // Unmarked sessions before today
        completed: false,
        cancelled: false
      }
    ];
  } else {
    // Default: completed sessions (any date) and unmarked sessions before today (exclude cancelled)
    query.$or = [
      { completed: true }, // Completed sessions (including today's completed)
      { 
        date: { $lt: today }, // Unmarked sessions before today
        completed: false,
        cancelled: false
      }
    ];
  }

  const sessions = await Session.find(query)
    .sort({ date: -1, time: 1 })
    .lean();

  const transformedSessions = transformDocuments(sessions);
  sendSuccess(res, { sessions: transformedSessions });
}));

// Get today's sessions (all sessions for today - unmarked, completed, and cancelled)
router.get('/today', authenticateToken, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const sessions = await Session.find({
    userId: req.userId,
    date: today // All of today's sessions (unmarked, completed, and cancelled)
  }).sort({ time: 1 }).lean();

  const transformedSessions = transformDocuments(sessions);
  sendSuccess(res, { sessions: transformedSessions });
}));

// Get upcoming sessions (incomplete and non-cancelled sessions from tomorrow onwards)
router.get('/upcoming', authenticateToken, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const sessions = await Session.find({
    userId: req.userId,
    date: { $gte: tomorrowStr }, // Only future dates (tomorrow onwards)
    completed: false,
    cancelled: false
  }).sort({ date: 1, time: 1 }).lean();

  const transformedSessions = transformDocuments(sessions);
  sendSuccess(res, { sessions: transformedSessions });
}));


// Create new session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { patientId, patientName, date, time, notes, completed, cancelled, amount } = req.body;

    if (!patientId || !patientName || !date || !time) {
      return res.status(400).json({ error: 'Patient ID, patient name, date, and time are required' });
    }

    // Verify the patient belongs to the current user
    const patient = await Patient.findOne({
      _id: patientId,
      userId: req.userId
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const session = new Session({
      userId: req.userId,
      patientId,
      patientName,
      date,
      time,
      notes: notes || '',
      completed: completed || false,
      cancelled: cancelled || false,
      amount: amount || null
    });

    await session.save();

    res.status(201).json({
      message: 'Session created successfully',
      session: transformDocuments([session])[0]
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Create multiple sessions (bulk)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { sessions } = req.body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ error: 'Sessions array is required and must not be empty' });
    }

    // Validate each session
    for (const session of sessions) {
      if (!session.patientId || !session.patientName || !session.date || !session.time) {
        return res.status(400).json({ error: 'Each session must have patientId, patientName, date, and time' });
      }
    }

    // Verify all patients belong to the current user
    const patientIds = [...new Set(sessions.map(s => s.patientId))];
    const patients = await Patient.find({
      _id: { $in: patientIds },
      userId: req.userId
    });

    if (patients.length !== patientIds.length) {
      return res.status(404).json({ error: 'One or more patients not found' });
    }

    // Create session documents
    const sessionDocs = sessions.map(sessionData => ({
      userId: req.userId,
      patientId: sessionData.patientId,
      patientName: sessionData.patientName,
      date: sessionData.date,
      time: sessionData.time,
      notes: sessionData.notes || '',
      completed: sessionData.completed || false,
      cancelled: sessionData.cancelled || false,
      amount: sessionData.amount || null
    }));

    // Insert all sessions
    const createdSessions = await Session.insertMany(sessionDocs);

    // Transform sessions for response
    const transformedSessions = transformDocuments(createdSessions);

    res.status(201).json({
      message: `${createdSessions.length} sessions created successfully`,
      sessions: transformedSessions
    });
  } catch (error) {
    console.error('Error creating multiple sessions:', error);
    res.status(500).json({ error: 'Failed to create sessions' });
  }
});

// Update session
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { patientId, patientName, date, time, notes, completed, cancelled, amount } = req.body;

    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update fields
    if (patientId) session.patientId = patientId;
    if (patientName) session.patientName = patientName;
    if (date) session.date = date;
    if (time) session.time = time;
    if (notes !== undefined) session.notes = notes;
    if (completed !== undefined) session.completed = completed;
    if (cancelled !== undefined) session.cancelled = cancelled;
    if (amount !== undefined) session.amount = amount;

    await session.save();

    res.json({
      message: 'Session updated successfully',
      session: transformDocuments([session])[0]
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await Session.findByIdAndDelete(req.params.id);

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
