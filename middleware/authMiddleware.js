const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Authentication middleware verifying JWT Bearer token
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Doctor authentication token missing.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Malformed authorization header. Expected "Bearer <token>".'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_doctor_talha_practice_2026_mbbs');

    // Optionally check if admin still exists in database
    const { rows } = await query('SELECT id, name, username, email, role, last_login FROM admins WHERE id = $1', [decoded.id]);
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Admin user no longer exists.'
      });
    }

    req.admin = rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Doctor session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid or unauthorized session token.'
    });
  }
}

module.exports = {
  verifyToken
};
