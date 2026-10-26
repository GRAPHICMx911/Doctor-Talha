const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');

const authRoutes = require('../../routes/authRoutes');
const bookingRoutes = require('../../routes/bookingRoutes');
const inquiryRoutes = require('../../routes/inquiryRoutes');
const serviceRoutes = require('../../routes/serviceRoutes');
const adminRoutes = require('../../routes/adminRoutes');
const { errorHandler } = require('../../middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get(['/api/health', '/.netlify/functions/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'Netlify Serverless Functions',
    timestamp: new Date().toISOString(),
    service: 'Dr. Muhammad Talha Hassan Shah Practice API'
  });
});

// API Routes
app.use(['/api/auth', '/.netlify/functions/api/auth'], authRoutes);
app.use(['/api/bookings', '/.netlify/functions/api/bookings'], bookingRoutes);
app.use(['/api/inquiries', '/.netlify/functions/api/inquiries'], inquiryRoutes);
app.use(['/api', '/.netlify/functions/api'], serviceRoutes);
app.use(['/api/admin', '/.netlify/functions/api/admin'], adminRoutes);

// Error Handler
app.use(errorHandler);

module.exports.handler = serverless(app);
