/**
 * Utility functions for consistent API responses
 * Single Responsibility: Handle response formatting
 */

/**
 * Transform MongoDB document to include id field
 * @param {Object} doc - MongoDB document
 * @returns {Object} Transformed document
 */
const transformDocument = (doc) => {
  if (!doc) return null;
  const docObj = doc.toObject ? doc.toObject() : doc;
  return {
    ...docObj,
    id: docObj._id.toString(),
    _id: docObj._id
  };
};

/**
 * Transform array of MongoDB documents
 * @param {Array} docs - Array of MongoDB documents
 * @returns {Array} Array of transformed documents
 */
const transformDocuments = (docs) => {
  if (!Array.isArray(docs)) return [];
  return docs.map(transformDocument);
};

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error
  });
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {string} error - Validation error message
 */
const sendValidationError = (res, error) => {
  sendError(res, error, 400);
};

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 */
const sendNotFoundError = (res, resource = 'Resource') => {
  sendError(res, `${resource} not found`, 404);
};

module.exports = {
  transformDocument,
  transformDocuments,
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFoundError
};
