const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 * Single Responsibility: Handle authentication only
 */
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
};

module.exports = {
  authenticateToken
};
