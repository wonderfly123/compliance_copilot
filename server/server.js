const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/plansRoutes'));
app.use('/api/references', require('./routes/referenceRoutes'));

// Basic route
app.get('/', (req, res) => {
  res.send('Compliance Copilot API is running');
});

// Handle undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// Set port and start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});