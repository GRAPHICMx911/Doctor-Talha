const { query, memoryStore } = require('../config/db');

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard metrics and clinical analytics
 */
async function getStats(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Total Bookings
      const { rows: totalBookingsRow } = await query('SELECT COUNT(*) FROM bookings');
      const totalBookings = parseInt(totalBookingsRow[0].count, 10);

      // Today's Bookings
      const { rows: todayBookingsRow } = await query(
        'SELECT COUNT(*) FROM bookings WHERE booking_date = $1',
        [today]
      );
      const todayBookings = parseInt(todayBookingsRow[0].count, 10);

      // Confirmed Bookings
      const { rows: confirmedRow } = await query(
        `SELECT COUNT(*) FROM bookings WHERE status = 'Confirmed'`
      );
      const confirmedBookings = parseInt(confirmedRow[0].count, 10);

      // Completed Bookings
      const { rows: completedRow } = await query(
        `SELECT COUNT(*) FROM bookings WHERE status = 'Completed'`
      );
      const completedBookings = parseInt(completedRow[0].count, 10);

      // Mode breakdown
      const { rows: inPersonRow } = await query(
        `SELECT COUNT(*) FROM bookings WHERE consultation_mode ILIKE '%Person%'`
      );
      const inPersonCount = parseInt(inPersonRow[0].count, 10);

      const { rows: telehealthRow } = await query(
        `SELECT COUNT(*) FROM bookings WHERE consultation_mode ILIKE '%Tele%' OR consultation_mode ILIKE '%Video%'`
      );
      const telehealthCount = parseInt(telehealthRow[0].count, 10);

      // Inquiries stats
      const { rows: totalInquiriesRow } = await query('SELECT COUNT(*) FROM inquiries');
      const totalInquiries = parseInt(totalInquiriesRow[0].count, 10);

      const { rows: unreadInquiriesRow } = await query(
        `SELECT COUNT(*) FROM inquiries WHERE status = 'Unread'`
      );
      const unreadInquiries = parseInt(unreadInquiriesRow[0].count, 10);

      // Recent 5 bookings
      const { rows: recentBookings } = await query(`
        SELECT id, booking_id, patient_name, patient_phone, service_type, consultation_mode,
               TO_CHAR(booking_date, 'YYYY-MM-DD') as booking_date, booking_time, status, created_at
        FROM bookings
        ORDER BY id DESC
        LIMIT 5;
      `);

      // Recent 5 inquiries
      const { rows: recentInquiries } = await query(`
        SELECT * FROM inquiries
        ORDER BY id DESC
        LIMIT 5;
      `);

      return res.status(200).json({
        success: true,
        stats: {
          total_bookings: totalBookings,
          today_bookings: todayBookings,
          confirmed_bookings: confirmedBookings,
          completed_bookings: completedBookings,
          in_person_bookings: inPersonCount,
          telehealth_bookings: telehealthCount,
          total_inquiries: totalInquiries,
          unread_inquiries: unreadInquiries,
          clinic_name: process.env.CLINIC_NAME || 'Dr. Muhammad Talha Hassan Shah, MBBS'
        },
        recent_bookings: recentBookings,
        recent_inquiries: recentInquiries
      });
    } catch (dbErr) {
      console.warn('[PostgreSQL Stats Fallback]:', dbErr.message);
      // Fallback to memory store when running on Netlify before cloud DB is configured
      const bookings = memoryStore.bookings || [];
      const inquiries = memoryStore.inquiries || [];

      return res.status(200).json({
        success: true,
        is_demo_mode: true,
        stats: {
          total_bookings: bookings.length,
          today_bookings: bookings.filter(b => b.booking_date === today).length,
          confirmed_bookings: bookings.filter(b => b.status === 'Confirmed').length,
          completed_bookings: bookings.filter(b => b.status === 'Completed').length,
          in_person_bookings: bookings.filter(b => (b.consultation_mode || '').includes('Person')).length,
          telehealth_bookings: bookings.filter(b => (b.consultation_mode || '').includes('Tele') || (b.consultation_mode || '').includes('Video')).length,
          total_inquiries: inquiries.length,
          unread_inquiries: inquiries.filter(i => i.status === 'Unread').length,
          clinic_name: process.env.CLINIC_NAME || 'Dr. Muhammad Talha Hassan Shah, MBBS'
        },
        recent_bookings: bookings.slice(0, 5),
        recent_inquiries: inquiries.slice(0, 5)
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats
};
