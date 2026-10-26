const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Check if DATABASE_URL (Cloud PostgreSQL like Neon, Supabase, Render, Aiven) is provided
const connectionString = process.env.DATABASE_URL;
let poolConfig;

if (connectionString) {
  poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'doctor_talha_db',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.warn('[PostgreSQL Pool Notice]: Idle client error or connection issue:', err.message);
});

/**
 * Executes a SQL query with parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * In-memory fallback store for when running in serverless environments (Netlify)
 * before a cloud PostgreSQL instance is connected
 */
const memoryStore = {
  bookings: [
    {
      id: 1,
      booking_id: 'THS-102938',
      patient_name: 'Muhammad Farooq',
      patient_phone: '+92 300 4567890',
      service_type: 'Hypertension & Diabetes Care',
      consultation_mode: 'In-Person Clinic Visit',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '4:30 PM - 5:00 PM',
      patient_notes: 'Regular 3-month HbA1c review and blood pressure adjustment.',
      status: 'Confirmed',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      booking_id: 'THS-482910',
      patient_name: 'Ayesha Bibi',
      patient_phone: '+92 333 7891234',
      service_type: 'Online Video Consultation',
      consultation_mode: 'Online Video Telehealth',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '6:30 PM - 7:00 PM',
      patient_notes: 'Follow-up consultation for seasonal respiratory allergies.',
      status: 'Confirmed',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      booking_id: 'THS-928174',
      patient_name: 'Zainab Fatima',
      patient_phone: '+92 321 6549870',
      service_type: 'Pediatric Health & Guidance',
      consultation_mode: 'In-Person Clinic Visit',
      booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      booking_time: '5:30 PM - 6:00 PM',
      patient_notes: 'Child routine wellness check and dietary nutrition consultation.',
      status: 'Pending',
      created_at: new Date().toISOString()
    }
  ],
  inquiries: [
    {
      id: 1,
      name: 'Hamza Khan',
      phone: '+92 345 1122334',
      subject: 'Telemedicine Guidance',
      message: 'Hello Dr. Talha, what platform is used for video calls? Zoom or WhatsApp video?',
      status: 'Replied',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Sana Tariq',
      phone: '+92 312 9988776',
      subject: 'Lab Report Submission',
      message: 'I have my lipid profile and fasting sugar reports. Can I share them before our clinic appointment?',
      status: 'Unread',
      created_at: new Date().toISOString()
    }
  ]
};

/**
 * Initializes database tables and default lookup data
 */
async function initDatabase() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1. Bookings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(50) UNIQUE NOT NULL,
        patient_name VARCHAR(150) NOT NULL,
        patient_phone VARCHAR(50) NOT NULL,
        service_type VARCHAR(150) NOT NULL,
        consultation_mode VARCHAR(60) NOT NULL DEFAULT 'In-Person Clinic Visit',
        booking_date DATE NOT NULL,
        booking_time VARCHAR(50) NOT NULL,
        patient_notes TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_bookings_patient ON bookings(patient_name, patient_phone);
    `);

    // 2. Inquiries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        subject VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Unread',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
      CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
    `);

    // 3. Clinical Services Catalog
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) UNIQUE NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        duration_minutes INT DEFAULT 30,
        fee_pkr NUMERIC(10,2) DEFAULT 2000.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Clinical Time Slots
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        slot_time VARCHAR(50) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // 5. Admins / Doctors Authentication Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'doctor_admin',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMPTZ
      );
    `);

    // Seed default services if empty
    const { rows: serviceCount } = await client.query('SELECT COUNT(*) FROM services');
    if (parseInt(serviceCount[0].count, 10) === 0) {
      const defaultServices = [
        ['General Adult Consultation', 'general', 'Acute clinical evaluation for fever, infections, cough, systemic illness', 30, 2000],
        ['Hypertension & Diabetes Care', 'chronic', 'Routine BP checks, blood glucose monitoring, HbA1c review & medical adjustment', 30, 2500],
        ['Pediatric Health & Guidance', 'pediatric', 'Child growth assessment, infant health evaluation, nutrition guidance', 30, 2000],
        ['Diagnostic Reports & ECG Review', 'diagnostics', 'ECG review, hematology analysis, ultrasound interpretation & clinical correlation', 20, 1500],
        ['Minor Wound & Post-Op Care', 'procedures', 'Wound dressing, suture removal, sterile trauma toilet & healing assessment', 25, 2000],
        ['Online Video Consultation', 'telehealth', 'HD video teleconsultation, digital prescription & lab follow-up from home', 30, 2000]
      ];
      for (const s of defaultServices) {
        await client.query(
          `INSERT INTO services (name, category, description, duration_minutes, fee_pkr) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING;`,
          s
        );
      }
    }

    // Seed default time slots if empty
    const { rows: slotCount } = await client.query('SELECT COUNT(*) FROM time_slots');
    if (parseInt(slotCount[0].count, 10) === 0) {
      const defaultSlots = [
        '3:30 PM - 4:00 PM',
        '4:30 PM - 5:00 PM',
        '5:30 PM - 6:00 PM',
        '6:30 PM - 7:00 PM',
        '7:30 PM - 8:00 PM',
        '8:30 PM - 9:00 PM'
      ];
      for (const slot of defaultSlots) {
        await client.query(
          `INSERT INTO time_slots (slot_time) VALUES ($1) ON CONFLICT (slot_time) DO NOTHING;`,
          [slot]
        );
      }
    }

    // Seed default Admin / Doctor account if empty
    const { rows: adminCount } = await client.query('SELECT COUNT(*) FROM admins');
    if (parseInt(adminCount[0].count, 10) === 0) {
      const defaultAdmin = {
        name: process.env.ADMIN_NAME || 'Dr. Muhammad Talha Hassan Shah, MBBS',
        username: process.env.ADMIN_USERNAME || 'dr.talha',
        email: (process.env.ADMIN_EMAIL || 'admin@drtalha.com').toLowerCase(),
        password: process.env.ADMIN_PASSWORD || 'DoctorTalha@2026',
        role: 'doctor_admin'
      };
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(defaultAdmin.password, salt);

      await client.query(
        `INSERT INTO admins (name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING;`,
        [defaultAdmin.name, defaultAdmin.username, defaultAdmin.email, passwordHash, defaultAdmin.role]
      );
      console.log(`[PostgreSQL]: Default doctor admin created (${defaultAdmin.email})`);
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL]: Database schemas and default records initialized successfully.');
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.warn('[PostgreSQL Initialization Notice]:', err.message);
  } finally {
    if (client) client.release();
  }
}

module.exports = {
  pool,
  query,
  initDatabase,
  memoryStore
};
