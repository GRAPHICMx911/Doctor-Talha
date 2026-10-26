const { query } = require('../config/db');

/**
 * @route   GET /api/services
 * @desc    Get active clinical services
 */
async function getServices(req, res, next) {
  try {
    const { category } = req.query;
    let sql = 'SELECT * FROM services WHERE is_active = TRUE';
    let values = [];

    if (category && category !== 'all') {
      sql += ' AND category = $1';
      values.push(category);
    }
    sql += ' ORDER BY id ASC;';

    const result = await query(sql, values);
    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/slots
 * @desc    Get available clinical time slots, optionally indicating which slots are taken on a specific date
 */
async function getSlots(req, res, next) {
  try {
    const { date } = req.query;

    const slotsResult = await query('SELECT * FROM time_slots WHERE is_active = TRUE ORDER BY id ASC;');
    const slots = slotsResult.rows;

    if (!date) {
      return res.status(200).json({
        success: true,
        data: slots
      });
    }

    // Check booked slots for this date
    const bookedResult = await query(
      `SELECT booking_time FROM bookings WHERE booking_date = $1 AND status != 'Cancelled'`,
      [date]
    );
    const bookedTimes = new Set(bookedResult.rows.map(r => r.booking_time));

    const enrichedSlots = slots.map(s => ({
      ...s,
      is_available: !bookedTimes.has(s.slot_time)
    }));

    return res.status(200).json({
      success: true,
      date,
      data: enrichedSlots
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServices,
  getSlots
};
