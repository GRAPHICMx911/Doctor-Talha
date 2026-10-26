const express = require('express');
const router = express.Router();
const {
  createInquiry,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry
} = require('../controllers/inquiryController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/inquiries is public for patient website inquiries
// GET /api/inquiries is protected for doctor review
router.route('/')
  .get(verifyToken, getAllInquiries)
  .post(createInquiry);

router.route('/:id')
  .delete(verifyToken, deleteInquiry);

router.patch('/:id/status', verifyToken, updateInquiryStatus);

module.exports = router;
