const { query } = require('../config/db');

const fallbackServices = [
  { id: 1, name: 'General Adult Consultation', category: 'general', description: 'Acute clinical evaluation for fever, infections, cough, systemic illness', duration_minutes: 30, fee_pkr: 2000.00 },
  { id: 2, name: 'Hypertension & Diabetes Care', category: 'chronic', description: 'Routine BP checks, blood glucose monitoring, HbA1c review & medical adjustment', duration_minutes: 30, fee_pkr: 2500.00 },
  { id: 3, name: 'Pediatric Health & Guidance', category: 'pediatric', description: 'Child growth assessment, infant health evaluation, nutrition guidance', duration_minutes: 30, fee_pkr: 2000.00 },
  { id: 4, name: 'Diagnostic Reports & ECG Review', category: 'diagnostics', description: 'ECG review, hematology analysis, ultrasound interpretation & clinical correlation', duration_minutes: 20, fee_pkr: 1500.00 },
  { id: 5, name: 'Minor Wound & Post-Op Care', category: 'procedures', description: 'Wound dressing, suture removal, sterile trauma toilet & healing assessment', duration_minutes: 25, fee_pkr: 2000.00 },
  { id: 6, name: 'Online Video Consultation', category: 'telehealth', description: 'HD video teleconsultation, digital prescription & lab follow-up from home', duration_minutes: 30, fee_pkr: 2000.00 }
];

const fallbackSlots = [
  { id: 1, slot_time: '3:30 PM - 4:00 PM', is_active: true },
  { id: 2, slot_time: '4:30 PM - 5:00 PM', is_active: true },
  { id: 3, slot_time: '5:30 PM - 6:00 PM', is_active: true },
  { id: 4, slot_time: '6:30 PM - 7:00 PM', is_active: true },
  { id: 5, slot_time: '7:30 PM - 8:00 PM', is_active: true },
  { id: 6, slot_time: '8:30 PM - 9:00 PM', is_active: true }
];

/**
 * @route   GET /api/services
 * @desc    Get active clinical services
 */
async function getServices(req, res, next) {
  try {
    const { category } = req.query;
    try {
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
    } catch (dbErr) {
      console.warn('[PostgreSQL Get Services Fallback]:', dbErr.message);
      let list = fallbackServices;
      if (category && category !== 'all') {
        list = list.filter(s => s.category === category);
      }
      return res.status(200).json({
        success: true,
        is_demo_mode: true,
        data: list
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/slots
 * @desc    Get available clinical time slots
 */
async function getSlots(req, res, next) {
  try {
    const { date } = req.query;

    try {
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
    } catch (dbErr) {
      console.warn('[PostgreSQL Get Slots Fallback]:', dbErr.message);
      return res.status(200).json({
        success: true,
        is_demo_mode: true,
        date: date || new Date().toISOString().split('T')[0],
        data: fallbackSlots.map(s => ({ ...s, is_available: true }))
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getServices,
  getSlots
};
