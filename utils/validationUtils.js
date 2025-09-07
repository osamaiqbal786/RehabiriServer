/**
 * Validation utility functions
 * Single Responsibility: Handle data validation
 */

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result { isValid: boolean, errors: Array }
 */
const validateRequiredFields = (data, requiredFields) => {
  const errors = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`${field} is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[0-9\s-()]{8,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate age range
 * @param {number} age - Age to validate
 * @param {number} min - Minimum age (default: 0)
 * @param {number} max - Maximum age (default: 150)
 * @returns {boolean} Is valid age
 */
const isValidAge = (age, min = 0, max = 150) => {
  const ageNum = parseInt(age, 10);
  return !isNaN(ageNum) && ageNum >= min && ageNum <= max;
};

/**
 * Validate gender
 * @param {string} gender - Gender to validate
 * @returns {boolean} Is valid gender
 */
const isValidGender = (gender) => {
  const validGenders = ['male', 'female', 'other'];
  return validGenders.includes(gender);
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} Is valid ObjectId
 */
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date to validate
 * @returns {boolean} Is valid date
 */
const isValidDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time to validate
 * @returns {boolean} Is valid time
 */
const isValidTime = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

module.exports = {
  validateRequiredFields,
  isValidEmail,
  isValidPhone,
  isValidAge,
  isValidGender,
  isValidObjectId,
  isValidDate,
  isValidTime
};
