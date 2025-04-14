// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register new user
router.post('/register', authController.register);

// Log in user
router.post('/login', authController.login);

// Get current user
router.get('/user', protect, authController.getUser);

// Log out user
router.post('/logout', protect, authController.logout);

module.exports = router;