const { query, memoryStore } = require('../config/db');

/**
 * Generate unique Booking ID formatted as THS-XXXXXX
 */
function generateBookingId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `THS-${randomNum}`;
}

/**
 * @route   POST /api/bookings
 * @desc    Create a new appointment booking
 */
async function createBooking(req, res, next) {
  try {
    const {
      patient_name,
      patient_phone,
      service_type,
      consultation_mode,
      booking_date,
      booking_time,
      patient_notes,
      booking_id
    } = req.body;

    if (!patient_name || !patient_phone || !service_type || !booking_date || !booking_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required booking fields: patient_name, patient_phone, service_type, booking_date, and booking_time are required.'
      });
    }

    const finalBookingId = booking_id && /^THS-\d+$/i.test(booking_id.trim()) 
      ? booking_id.trim().toUpperCase() 
      : generateBookingId();

    const finalMode = consultation_mode || 'In-Person Clinic Visit';
    const finalNotes = patient_notes ? patient_notes.trim() : null;

    try {
      // Insert into PostgreSQL
      const sql = `
        INSERT INTO bookings (
          booking_id,
          patient_name,
          patient_phone,
          service_type,
          consultation_mode,
          booking_date,
          booking_time,
          patient_notes,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed')
        ON CONFLICT (booking_id) DO UPDATE SET
          patient_name = EXCLUDED.patient_name,
          patient_phone = EXCLUDED.patient_phone,
          service_type = EXCLUDED.service_type,
          consultation_mode = EXCLUDED.consultation_mode,
          booking_date = EXCLUDED.booking_date,
          booking_time = EXCLUDED.booking_time,
          patient_notes = EXCLUDED.patient_notes,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *, TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date;
      `;

      const values = [
        finalBookingId,
        patient_name.trim(),
        patient_phone.trim(),
        service_type.trim(),
        finalMode.trim(),
        booking_date,
        booking_time.trim(),
        finalNotes
      ];

      const result = await query(sql, values);
      return res.status(201).json({
        success: true,
        message: 'Appointment reserved successfully in PostgreSQL database!',
        data: result.rows[0]
      });
    } catch (dbErr) {
      console.warn('[PostgreSQL Create Booking Fallback]:', dbErr.message);
      // Fallback for Netlify before cloud DB is set
      const newBooking = {
        id: memoryStore.bookings.length + 1,
        booking_id: finalBookingId,
        patient_name: patient_name.trim(),
        patient_phone: patient_phone.trim(),
        service_type: service_type.trim(),
        consultation_mode: finalMode.trim(),
        booking_date,
        booking_time: booking_time.trim(),
        patient_notes: finalNotes,
        status: 'Confirmed',
        created_at: new Date().toISOString()
      };
      memoryStore.bookings.unshift(newBooking);

      return res.status(201).json({
        success: true,
        is_demo_mode: true,
        message: 'Appointment reserved successfully!',
        data: newBooking
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings with optional filtering & pagination
 */
async function getAllBookings(req, res, next) {
  try {
    const { status, date, mode, search, limit = 50, offset = 0 } = req.query;

    try {
      let conditions = [];
      let values = [];
      let paramIndex = 1;

      if (status && status !== 'all') {
        conditions.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (date) {
        conditions.push(`booking_date = $${paramIndex++}`);
        values.push(date);
      }

      if (mode && mode !== 'all') {
        conditions.push(`consultation_mode ILIKE $${paramIndex++}`);
        values.push(`%${mode}%`);
      }

      if (search) {
        conditions.push(`(
          patient_name ILIKE $${paramIndex} OR 
          patient_phone ILIKE $${paramIndex} OR 
          booking_id ILIKE $${paramIndex} OR
          service_type ILIKE $${paramIndex}
        )`);
        values.push(`%${search.trim()}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) FROM bookings ${whereClause};`;
      const countResult = await query(countSql, values);
      const totalCount = parseInt(countResult.rows[0].count, 10);

      const dataSql = `
        SELECT 
          id,
          booking_id,
          patient_name,
          patient_phone,
          service_type,
          consultation_mode,
          TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date,
          booking_time,
          patient_notes,
          status,
          created_at,
          updated_at
        FROM bookings
        ${whereClause}
        ORDER BY booking_date DESC, booking_time ASC, id DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++};
      `;
      values.push(parseInt(limit, 10), parseInt(offset, 10));

      const result = await query(dataSql, values);

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        total: totalCount,
        data: result.rows
      });
    } catch (dbErr) {
      console.warn('[PostgreSQL Get Bookings Fallback]:', dbErr.message);
      let list = memoryStore.bookings || [];

      if (status && status !== 'all') {
        list = list.filter(b => b.status === status);
      }
      if (date) {
        list = list.filter(b => b.booking_date === date);
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(b => 
          (b.patient_name || '').toLowerCase().includes(s) ||
          (b.patient_phone || '').includes(s) ||
          (b.booking_id || '').toLowerCase().includes(s)
        );
      }

      return res.status(200).json({
        success: true,
        is_demo_mode: true,
        count: list.length,
        total: list.length,
        data: list
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   GET /api/bookings/:id
 * @desc    Get single booking by ID or booking_id
 */
async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    try {
      const isBookingCode = /^THS-\d+$/i.test(id);
      const sql = isBookingCode
        ? `SELECT *, TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date FROM bookings WHERE booking_id = $1;`
        : `SELECT *, TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date FROM bookings WHERE id = $1;`;

      const result = await query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Booking with identifier '${id}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    } catch (dbErr) {
      const found = memoryStore.bookings.find(b => b.booking_id === id || String(b.id) === String(id));
      if (!found) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      return res.status(200).json({ success: true, data: found });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Update booking status (Confirmed, Completed, Cancelled, Pending)
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Confirmed', 'Completed', 'Cancelled', 'Pending'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${validStatuses.join(', ')}`
      });
    }

    try {
      const isBookingCode = /^THS-\d+$/i.test(id);
      const sql = isBookingCode
        ? `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE booking_id = $2 RETURNING *, TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date;`
        : `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *, TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date;`;

      const result = await query(sql, [status, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Booking '${id}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Booking status updated to ${status}.`,
        data: result.rows[0]
      });
    } catch (dbErr) {
      const b = memoryStore.bookings.find(item => item.booking_id === id || String(item.id) === String(id));
      if (!b) return res.status(404).json({ success: false, message: 'Booking not found' });
      b.status = status;
      return res.status(200).json({ success: true, message: `Status updated to ${status}`, data: b });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel/delete an appointment
 */
async function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    try {
      const isBookingCode = /^THS-\d+$/i.test(id);
      const sql = isBookingCode
        ? `DELETE FROM bookings WHERE booking_id = $1 RETURNING id, booking_id;`
        : `DELETE FROM bookings WHERE id = $1 RETURNING id, booking_id;`;

      const result = await query(sql, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Booking '${id}' not found.`
        });
      }

      return res.status(200).json({
        success: true,
        message: `Booking ${result.rows[0].booking_id} has been deleted successfully.`
      });
    } catch (dbErr) {
      const idx = memoryStore.bookings.findIndex(item => item.booking_id === id || String(item.id) === String(id));
      if (idx !== -1) memoryStore.bookings.splice(idx, 1);
      return res.status(200).json({ success: true, message: 'Booking deleted' });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking
};
