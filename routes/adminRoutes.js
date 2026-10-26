const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protected admin practice stats
router.get('/stats', verifyToken, getStats);

module.exports = router;
