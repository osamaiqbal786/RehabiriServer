const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendValidationError, sendNotFoundError } = require('../utils/responseUtils');
const { validateRequiredFields, isValidAge, isValidGender, isValidObjectId } = require('../utils/validationUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const PatientService = require('../services/patientService');
const router = express.Router();

// Get all patients for the current user
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const patients = await PatientService.getAllPatients(req.userId);
  sendSuccess(res, { patients });
}));


// Create new patient
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { name, contactNumber, age, gender } = req.body;

  // Validate required fields
  const requiredValidation = validateRequiredFields(req.body, ['name', 'age', 'gender']);
  if (!requiredValidation.isValid) {
    return sendValidationError(res, requiredValidation.errors.join(', '));
  }

  // Validate age
  if (!isValidAge(age)) {
    return sendValidationError(res, 'Valid age is required (0-150)');
  }

  // Validate gender
  if (!isValidGender(gender)) {
    return sendValidationError(res, 'Gender is required (male, female, or other)');
  }

  const patient = await PatientService.createPatient(req.body, req.userId);
  sendSuccess(res, { patient }, 'Patient created successfully', 201);
}));

// Update patient
router.put('/:id', authenticateToken, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendValidationError(res, 'Invalid patient ID format');
  }

  const { age, gender } = req.body;

  // Validate age if provided
  if (age !== undefined && !isValidAge(age)) {
    return sendValidationError(res, 'Valid age is required (0-150)');
  }

  // Validate gender if provided
  if (gender !== undefined && !isValidGender(gender)) {
    return sendValidationError(res, 'Gender is required (male, female, or other)');
  }

  const patient = await PatientService.updatePatient(req.params.id, req.body, req.userId);
  if (!patient) {
    return sendNotFoundError(res, 'Patient');
  }

  sendSuccess(res, { patient }, 'Patient updated successfully');
}));


// Update session details for all sessions of a patient
router.put('/:id/sessions/details', authenticateToken, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendValidationError(res, 'Invalid patient ID format');
  }

  const { notes, time, amount } = req.body;

  // Build update object with only provided fields
  const updateFields = {};
  if (notes !== undefined) updateFields.notes = notes.trim();
  if (time !== undefined) updateFields.time = time;
  if (amount !== undefined) updateFields.amount = amount;

  if (Object.keys(updateFields).length === 0) {
    return sendValidationError(res, 'At least one field (notes, time, or amount) is required');
  }

  const modifiedCount = await PatientService.updateAllPatientSessions(req.params.id, updateFields, req.userId);
  sendSuccess(res, { modifiedCount }, `Updated ${modifiedCount} sessions for patient`);
}));

// Close all upcoming sessions for a patient (mark as cancelled)
router.put('/:id/sessions/close', authenticateToken, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendValidationError(res, 'Invalid patient ID format');
  }

  const closedCount = await PatientService.closeAllUpcomingSessions(req.params.id, req.userId);
  sendSuccess(res, { modifiedCount: closedCount }, `Closed ${closedCount} upcoming sessions for patient`);
}));

// Delete patient
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendValidationError(res, 'Invalid patient ID format');
  }

  const deleted = await PatientService.deletePatient(req.params.id, req.userId);
  if (!deleted) {
    return sendNotFoundError(res, 'Patient');
  }

  sendSuccess(res, null, 'Patient deleted successfully');
}));

// Get last active session date for a patient
router.get('/:id/sessions/last-active', authenticateToken, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendValidationError(res, 'Invalid patient ID format');
  }

  const lastActiveDate = await PatientService.getLastActiveSessionDate(req.params.id, req.userId);
  sendSuccess(res, { lastActiveDate });
}));

// Get patients with active sessions
router.post('/active-sessions', authenticateToken, asyncHandler(async (req, res) => {
  const { patientIds } = req.body;
  
  if (!Array.isArray(patientIds)) {
    return sendValidationError(res, 'patientIds must be an array');
  }

  const activePatientIds = await PatientService.getPatientsWithActiveSessions(patientIds, req.userId);
  sendSuccess(res, { activePatientIds });
}));

module.exports = router;
