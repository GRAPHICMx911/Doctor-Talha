const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking
} = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/bookings is public for patient website reservations
// GET /api/bookings is protected for doctor/staff review
router.route('/')
  .get(verifyToken, getAllBookings)
  .post(createBooking);

// Protected appointment details, status change, and cancellation
router.route('/:id')
  .get(verifyToken, getBookingById)
  .delete(verifyToken, deleteBooking);

router.patch('/:id/status', verifyToken, updateBookingStatus);

module.exports = router;
