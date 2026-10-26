const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate doctor/admin & generate JWT token
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.'
      });
    }

    const trimmedIdentifier = username.trim().toLowerCase();

    // Find admin by email or username
    const sql = `
      SELECT id, name, username, email, password_hash, role, last_login 
      FROM admins 
      WHERE LOWER(email) = $1 OR LOWER(username) = $1;
    `;
    const result = await query(sql, [trimmedIdentifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/username and password.'
      });
    }

    const admin = result.rows[0];

    // Verify password hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email/username and password.'
      });
    }

    // Update last_login
    await query('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [admin.id]);

    // Sign JWT token
    const payload = {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: admin.role
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_jwt_key_doctor_talha_practice_2026_mbbs',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome, ${admin.name}!`,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        last_login: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in doctor profile
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    admin: req.admin
  });
}

/**
 * @route   POST /api/auth/change-password
 * @desc    Change doctor admin password
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;
    const adminId = req.admin.id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const { rows } = await query('SELECT password_hash FROM admins WHERE id = $1', [adminId]);
    const isMatch = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(new_password, salt);

    await query('UPDATE admins SET password_hash = $1 WHERE id = $2', [newHash, adminId]);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  getMe,
  changePassword
};
