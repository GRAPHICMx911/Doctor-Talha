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
app.get(['/health', '/api/health', '/.netlify/functions/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'Netlify Serverless Functions',
    timestamp: new Date().toISOString(),
    service: 'Dr. Muhammad Talha Hassan Shah Practice API'
  });
});

// Router for sub-paths
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/inquiries', inquiryRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', serviceRoutes);

// Mount across all possible Netlify rewrite prefixes
app.use('/.netlify/functions/api', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Centralized error handler
app.use(errorHandler);

module.exports.handler = serverless(app);
