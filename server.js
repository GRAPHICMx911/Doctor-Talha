const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initDatabase } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Admin Portal Route
app.get(['/admin', '/admin/*'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Dr. Muhammad Talha Hassan Shah Practice Backend',
    database: 'PostgreSQL',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api', serviceRoutes);
app.use('/api/admin', adminRoutes);

// Frontend Landing Page Route
// Reads original Index.html, dynamically connects the api-bridge script and local assets, and serves it
// Note: Index.html on disk remains 100% UNTOUCHED!
app.get(['/', '/index.html'], (req, res, next) => {
  const filePath = path.join(__dirname, 'Index.html');
  fs.readFile(filePath, 'utf8', (err, html) => {
    if (err) {
      return next(err);
    }
    
    // Inject local FontAwesome & favicon in <head>
    let enrichedHtml = html;
    const localHeadTags = `
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css" crossorigin="anonymous">
`;
    if (!enrichedHtml.includes('/vendor/fontawesome/css/all.min.css')) {
      enrichedHtml = enrichedHtml.replace('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">', localHeadTags);
    }

    // Replace inline base64 image with fast-loading cached asset
    const base64ImgRegex = /<img\s+src="data:image\/jpeg;base64,[^"]+"\s+alt="Modern Consultation Room"\s+class="([^"]+)">/i;
    if (base64ImgRegex.test(enrichedHtml)) {
      enrichedHtml = enrichedHtml.replace(base64ImgRegex, `<img src="/images/hero-clinic.jpg" alt="Modern Consultation Room" class="w-full h-80 object-cover" loading="eager" onerror="this.onerror=null; this.src='/images/logo.svg';">`);
    }

    // Inject api-bridge right before closing body tag
    const bridgeScript = `
  <!-- Node.js + Express + PostgreSQL Live Bridge -->
  <script src="/js/api-bridge.js"></script>
</body>`;
    enrichedHtml = enrichedHtml.replace('</body>', bridgeScript);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(enrichedHtml);
  });
});

// 404 & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server after verifying database initialization
async function startServer() {
  try {
    console.log('[Server]: Connecting to PostgreSQL database...');
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`  Dr. Talha Hassan Shah Clinic Practice Backend`);
      console.log(`  Server running on: http://localhost:${PORT}`);
      console.log(`  Patient Frontend:  http://localhost:${PORT}/`);
      console.log(`  Doctor Portal:     http://localhost:${PORT}/admin`);
      console.log(`  API Health:        http://localhost:${PORT}/api/health`);
      console.log(`  Database:          PostgreSQL (${process.env.DB_NAME || 'doctor_talha_db'})`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('[Server Launch Error]: Could not start server due to database error:', error);
    process.exit(1);
  }
}

startServer();
