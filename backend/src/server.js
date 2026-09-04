const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();

// =============== MIDDLEWARE ===============
// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(morgan('combined'));

// =============== DATABASE CONNECTION ===============
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medioracle';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// =============== API ROUTES ===============
const authRoutes = require('./routes/auth');
const facilityRoutes = require('./routes/facilities');
const professionalRoutes = require('./routes/professionals');
const shiftRoutes = require('./routes/shifts');
const offerRoutes = require('./routes/offers');
const bookingRoutes = require('./routes/bookings');
const timesheetRoutes = require('./routes/timesheets');
const paymentRoutes = require('./routes/payments');
const ratingRoutes = require('./routes/ratings');
const analyticsRoutes = require('./routes/analytics');

app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/analytics', analyticsRoutes);

// =============== HEALTH CHECK ===============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Nexgile-MediOracle Healthcare Workforce Portal API',
    version: '1.0.0',
    endpoints: '/api/*'
  });
});

// =============== ERROR HANDLING ===============
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      details: err.message 
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      error: 'Invalid token',
      message: err.message 
    });
  }
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// =============== START SERVER ===============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   Nexgile-MediOracle Healthcare Workforce Portal           ║
║   Backend Server Running                                    ║
╚════════════════════════════════════════════════════════════╝
  
  🚀 Server: http://localhost:${PORT}
  📊 API: http://localhost:${PORT}/api
  💾 Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/medioracle'}
  🔒 Environment: ${process.env.NODE_ENV || 'development'}
  ⏰ Started: ${new Date().toISOString()}
  
  📚 API Documentation:
     - GET /health - Health check
     - GET / - API info
     - /api/auth/* - Authentication
     - /api/facilities/* - Facility management
     - /api/professionals/* - Professional profiles
     - /api/shifts/* - Shift management
     - /api/offers/* - Shift offers
     - /api/bookings/* - Bookings
     - /api/timesheets/* - Time tracking
     - /api/payments/* - Payment processing
     - /api/ratings/* - Quality ratings
     - /api/analytics/* - Analytics & reports
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
