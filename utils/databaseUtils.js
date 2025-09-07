/**
 * Database utility functions
 * Single Responsibility: Handle database operations and queries
 */

/**
 * Build date range query for MongoDB
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} MongoDB date query
 */
const buildDateRangeQuery = (startDate, endDate) => {
  const query = {};
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  return query;
};

/**
 * Build session filter query
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options
 * @returns {Object} MongoDB query object
 */
const buildSessionFilterQuery = (userId, filters = {}) => {
  const { patientId, startDate, endDate, completed, includeCancelled } = filters;
  
  let query = { userId };
  
  if (patientId) query.patientId = patientId;
  if (completed !== undefined) query.completed = completed === 'true';
  
  // Handle cancelled sessions filter
  if (includeCancelled === 'false') {
    query.cancelled = false;
  } else if (includeCancelled === 'true') {
    // When includeCancelled is true, we want both cancelled and non-cancelled sessions
    // So we don't add any cancelled filter - this will include all sessions
  }
  // If includeCancelled is undefined, we don't filter by cancelled status
  
  // Add date range if provided
  const dateQuery = buildDateRangeQuery(startDate, endDate);
  Object.assign(query, dateQuery);
  
  return query;
};

/**
 * Build earnings aggregation pipeline
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (optional)
 * @param {string} endDate - End date (optional)
 * @returns {Array} MongoDB aggregation pipeline
 */
const buildEarningsPipeline = (userId, startDate, endDate) => {
  const matchStage = { 
    userId,
    completed: true,
    amount: { $exists: true, $gt: 0 }
  };
  
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = startDate;
    if (endDate) matchStage.date.$lte = endDate;
  }

  return [
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: { $dateFromString: { dateString: '$date' } } },
          month: { $month: { $dateFromString: { dateString: '$date' } } }
        },
        totalEarnings: { $sum: '$amount' },
        sessionCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ];
};

/**
 * Build pagination options
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {Object} Pagination options { skip, limit }
 */
const buildPaginationOptions = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { 
    skip, 
    limit: parseInt(limit, 10) 
  };
};

/**
 * Build sort options
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {Object} Sort options
 */
const buildSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

module.exports = {
  buildDateRangeQuery,
  buildSessionFilterQuery,
  buildEarningsPipeline,
  buildPaginationOptions,
  buildSortOptions
};
