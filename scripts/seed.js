require('dotenv').config();
const { pool, initDatabase, query } = require('../config/db');

async function seedData() {
  console.log('--- Initializing Database & Seeding Data ---');
  try {
    await initDatabase();

    // Check existing bookings
    const { rows: existingBookings } = await query('SELECT COUNT(*) FROM bookings');
    if (parseInt(existingBookings[0].count, 10) === 0) {
      console.log('Seeding initial clinical bookings...');
      const sampleBookings = [
        {
          booking_id: 'THS-102938',
          patient_name: 'Muhammad Farooq',
          patient_phone: '+92 300 4567890',
          service_type: 'Hypertension & Diabetes Care',
          consultation_mode: 'In-Person Clinic Visit',
          booking_date: new Date().toISOString().split('T')[0],
          booking_time: '4:30 PM - 5:00 PM',
          patient_notes: 'Regular 3-month HbA1c review and blood pressure adjustment.',
          status: 'Confirmed'
        },
        {
          booking_id: 'THS-482910',
          patient_name: 'Ayesha Bibi',
          patient_phone: '+92 333 7891234',
          service_type: 'Online Video Consultation',
          consultation_mode: 'Online Video Telehealth',
          booking_date: new Date().toISOString().split('T')[0],
          booking_time: '6:30 PM - 7:00 PM',
          patient_notes: 'Follow-up consultation for seasonal respiratory allergies.',
          status: 'Confirmed'
        },
        {
          booking_id: 'THS-928174',
          patient_name: 'Zainab Fatima',
          patient_phone: '+92 321 6549870',
          service_type: 'Pediatric Health & Guidance',
          consultation_mode: 'In-Person Clinic Visit',
          booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          booking_time: '5:30 PM - 6:00 PM',
          patient_notes: 'Child routine wellness check and dietary nutrition consultation.',
          status: 'Pending'
        }
      ];

      for (const b of sampleBookings) {
        await query(
          `INSERT INTO bookings (booking_id, patient_name, patient_phone, service_type, consultation_mode, booking_date, booking_time, patient_notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (booking_id) DO NOTHING`,
          [b.booking_id, b.patient_name, b.patient_phone, b.service_type, b.consultation_mode, b.booking_date, b.booking_time, b.patient_notes, b.status]
        );
      }
      console.log('Sample bookings inserted.');
    } else {
      console.log(`Found ${existingBookings[0].count} existing bookings.`);
    }

    // Check existing inquiries
    const { rows: existingInquiries } = await query('SELECT COUNT(*) FROM inquiries');
    if (parseInt(existingInquiries[0].count, 10) === 0) {
      console.log('Seeding initial inquiries...');
      const sampleInquiries = [
        {
          name: 'Hamza Khan',
          phone: '+92 345 1122334',
          subject: 'Telemedicine Guidance',
          message: 'Hello Dr. Talha, what platform is used for video calls? Zoom or WhatsApp video?',
          status: 'Replied'
        },
        {
          name: 'Sana Tariq',
          phone: '+92 312 9988776',
          subject: 'Lab Report Submission',
          message: 'I have my lipid profile and fasting sugar reports. Can I share them before our clinic appointment?',
          status: 'Unread'
        }
      ];

      for (const inq of sampleInquiries) {
        await query(
          `INSERT INTO inquiries (name, phone, subject, message, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [inq.name, inq.phone, inq.subject, inq.message, inq.status]
        );
      }
      console.log('Sample inquiries inserted.');
    } else {
      console.log(`Found ${existingInquiries[0].count} existing inquiries.`);
    }

    console.log('--- Database seeding completed successfully ---');
  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    await pool.end();
  }
}

seedData();
