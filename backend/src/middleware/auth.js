const authService = require('../services/authService');

// JWT authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.id);
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional authentication (sets req.user if token is valid, continues regardless)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.id);
      req.user = user;
    }
  } catch (error) {
    // Continue without user if token is invalid
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};