const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer'); // Changed from fileUpload to multer
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Detect environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

console.log(`Running in ${isDevelopment ? 'development' : 'production'} mode`);

// In development mode, we don't need to panic about DB connection failure
// Initialize Supabase client (just require it, it self-initializes)
const supabase = require('./config/supabase');
console.log('Supabase client initialized');

// Initialize Express
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/plansRoutes'));
app.use('/api/references', require('./routes/referenceRoutes'));
app.use('/api/ai', require('./routes/aiRoutes')); // Add the new AI routes

// Basic route
app.get('/', (req, res) => {
  res.send('Compliance Copilot API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Set pok rt and start server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  
  // In development, log the error but don't shut down
  if (isDevelopment) {
    console.error('Unhandled promise rejection:', err);
  } else {
    // In production, close server & exit process
    server.close(() => process.exit(1));
  }
});

module.exports = server;