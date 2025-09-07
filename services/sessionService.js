/**
 * Session Service Layer
 * Single Responsibility: Handle all session-related business logic
 */

const Session = require('../models/Session');
const Patient = require('../models/Patient');
const { transformDocuments } = require('../utils/responseUtils');
const { buildSessionFilterQuery, buildEarningsPipeline } = require('../utils/databaseUtils');

class SessionService {
  /**
   * Get all sessions for a user with filters
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of sessions
   */
  static async getAllSessions(userId, filters = {}) {
    const query = buildSessionFilterQuery(userId, filters);

    const sessions = await Session.find(query)
      .sort({ date: -1, time: -1 })
      .lean();

    return transformDocuments(sessions);
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Session object or null
   */
  static async getSessionById(sessionId, userId) {
    const session = await Session.findOne({
      _id: sessionId,
      userId
    });

    if (!session) return null;
    return transformDocuments([session])[0];
  }

  /**
   * Create a new session
   * @param {Object} sessionData - Session data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created session
   */
  static async createSession(sessionData, userId) {
    const { patientId, patientName, date, time, notes, amount } = sessionData;

    const session = new Session({
      userId,
      patientId,
      patientName: patientName.trim(),
      date,
      time,
      notes: notes?.trim() || '',
      amount: amount || null
    });

    await session.save();
    return transformDocuments([session])[0];
  }

  /**
   * Create multiple sessions
   * @param {Array} sessionsData - Array of session data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of created sessions
   */
  static async createMultipleSessions(sessionsData, userId) {
    const sessions = sessionsData.map(sessionData => ({
      userId,
      patientId: sessionData.patientId,
      patientName: sessionData.patientName.trim(),
      date: sessionData.date,
      time: sessionData.time,
      notes: sessionData.notes?.trim() || '',
      amount: sessionData.amount || null
    }));

    const createdSessions = await Session.insertMany(sessions);
    return transformDocuments(createdSessions);
  }

  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated session or null
   */
  static async updateSession(sessionId, updateData, userId) {
    const { notes, time, amount, completed, cancelled } = updateData;

    const session = await Session.findOne({
      _id: sessionId,
      userId
    });

    if (!session) return null;

    // Update fields
    if (notes !== undefined) session.notes = notes?.trim() || '';
    if (time !== undefined) session.time = time;
    if (amount !== undefined) session.amount = amount;
    if (completed !== undefined) session.completed = completed;
    if (cancelled !== undefined) {
      session.cancelled = cancelled;
      if (cancelled) session.amount = 0;
    }

    await session.save();
    return transformDocuments([session])[0];
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteSession(sessionId, userId) {
    const result = await Session.deleteOne({
      _id: sessionId,
      userId
    });

    return result.deletedCount > 0;
  }

  /**
   * Update all sessions for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions updated
   */
  static async updateAllPatientSessions(patientId, updateData, userId) {
    const { notes, time, amount } = updateData;
    const updateFields = {};

    if (notes !== undefined) updateFields.notes = notes?.trim() || '';
    if (time !== undefined) updateFields.time = time;
    if (amount !== undefined) updateFields.amount = amount;

    const result = await Session.updateMany(
      {
        patientId,
        userId,
        completed: false,
        cancelled: false
      },
      { $set: updateFields }
    );

    return result.modifiedCount;
  }

  /**
   * Get monthly earnings
   * @param {string} userId - User ID
   * @param {string} startDate - Start date (optional)
   * @param {string} endDate - End date (optional)
   * @returns {Promise<Array>} Array of monthly earnings
   */
  static async getMonthlyEarnings(userId, startDate, endDate) {
    const pipeline = buildEarningsPipeline(userId, startDate, endDate);
    return await Session.aggregate(pipeline);
  }

  /**
   * Get today's sessions
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of today's sessions
   */
  static async getTodaySessions(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const sessions = await Session.find({
      userId,
      date: today,
      cancelled: false
    })
    .sort({ time: 1 })
    .lean();

    return transformDocuments(sessions);
  }

  /**
   * Get upcoming sessions
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of upcoming sessions
   */
  static async getUpcomingSessions(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const sessions = await Session.find({
      userId,
      date: { $gte: today },
      completed: false,
      cancelled: false
    })
    .sort({ date: 1, time: 1 })
    .lean();

    return transformDocuments(sessions);
  }

  /**
   * Get past sessions
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of past sessions
   */
  static async getPastSessions(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const sessions = await Session.find({
      userId,
      $or: [
        { date: { $lt: today } },
        { completed: true },
        { cancelled: true }
      ]
    })
    .sort({ date: -1, time: -1 })
    .lean();

    return transformDocuments(sessions);
  }
}

module.exports = SessionService;
