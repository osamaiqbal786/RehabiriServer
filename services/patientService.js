/**
 * Patient Service Layer
 * Single Responsibility: Handle all patient-related business logic
 */

const Patient = require('../models/Patient');
const Session = require('../models/Session');
const { transformDocuments } = require('../utils/responseUtils');
const { buildSessionFilterQuery } = require('../utils/databaseUtils');

class PatientService {
  /**
   * Get all patients for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of patients
   */
  static async getAllPatients(userId) {
    const patients = await Patient.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    
    return transformDocuments(patients);
  }


  /**
   * Create a new patient
   * @param {Object} patientData - Patient data
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created patient
   */
  static async createPatient(patientData, userId) {
    const { name, contactNumber, age, gender } = patientData;

    const patient = new Patient({
      userId,
      name: name.trim(),
      contactNumber: contactNumber?.trim(),
      age: parseInt(age, 10),
      gender
    });

    await patient.save();
    return transformDocuments([patient])[0];
  }

  /**
   * Update patient
   * @param {string} patientId - Patient ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Updated patient or null
   */
  static async updatePatient(patientId, updateData, userId) {
    const { name, contactNumber, age, gender } = updateData;

    const patient = await Patient.findOne({
      _id: patientId,
      userId
    });

    if (!patient) return null;

    // Update fields
    if (name) patient.name = name.trim();
    if (contactNumber !== undefined) patient.contactNumber = contactNumber?.trim();
    if (age !== undefined) patient.age = parseInt(age, 10);
    if (gender !== undefined) patient.gender = gender;

    await patient.save();
    return transformDocuments([patient])[0];
  }

  /**
   * Delete patient
   * @param {string} patientId - Patient ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async deletePatient(patientId, userId) {
    const result = await Patient.deleteOne({
      _id: patientId,
      userId
    });

    return result.deletedCount > 0;
  }

  /**
   * Get patient sessions
   * @param {string} patientId - Patient ID
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of sessions
   */
  static async getPatientSessions(patientId, userId, filters = {}) {
    const query = buildSessionFilterQuery(userId, {
      ...filters,
      patientId
    });

    const sessions = await Session.find(query)
      .sort({ date: -1, time: -1 })
      .lean();

    return transformDocuments(sessions);
  }

  /**
   * Get last active session date for a patient
   * @param {string} patientId - Patient ID
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Last active session date or null
   */
  static async getLastActiveSessionDate(patientId, userId) {
    const session = await Session.findOne({
      patientId,
      userId,
      completed: false,
      cancelled: false
    })
    .sort({ date: -1 })
    .select('date')
    .lean();

    return session ? session.date : null;
  }

  /**
   * Check if patient has active sessions
   * @param {string} patientId - Patient ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Has active sessions
   */
  static async hasActiveSessions(patientId, userId) {
    const count = await Session.countDocuments({
      patientId,
      userId,
      completed: false,
      cancelled: false
    });

    return count > 0;
  }

  /**
   * Check multiple patients for active sessions
   * @param {Array} patientIds - Array of patient IDs
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of patient IDs with active sessions
   */
  static async getPatientsWithActiveSessions(patientIds, userId) {
    const sessions = await Session.find({
      patientId: { $in: patientIds },
      userId,
      completed: false,
      cancelled: false
    })
    .select('patientId')
    .lean();

    // Get unique patient IDs that have active sessions
    const activePatientIds = [...new Set(sessions.map(session => session.patientId.toString()))];
    return activePatientIds;
  }

  /**
   * Update all sessions for a patient
   * @param {string} patientId - Patient ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions updated
   */
  static async updateAllPatientSessions(patientId, updateData, userId) {
    const result = await Session.updateMany(
      {
        patientId,
        userId,
        completed: false,
        cancelled: false
      },
      { $set: updateData }
    );

    return result.modifiedCount;
  }

  /**
   * Close all upcoming sessions for a patient
   * @param {string} patientId - Patient ID
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of sessions closed
   */
  static async closeAllUpcomingSessions(patientId, userId) {
    const result = await Session.updateMany(
      {
        patientId,
        userId,
        completed: false,
        cancelled: false
      },
      {
        $set: { cancelled: true, amount: 0 }
      }
    );

    return result.modifiedCount;
  }
}

module.exports = PatientService;
