const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is invalid. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

/**
 * Require admin role (super_admin, faculty_admin, or legacy admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !['super_admin', 'faculty_admin', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

/**
 * Require super admin role strictly
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin privileges required.' });
  }
  next();
};

/**
 * Require student role
 */
const requireStudent = (req, res, next) => {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Student access only.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireSuperAdmin, requireStudent };
