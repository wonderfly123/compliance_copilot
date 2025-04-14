const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  // Always bypass authentication for development and testing
  if (process.env.NODE_ENV !== 'production') {
    // Set a default user for development
    req.user = {
      id: 'dev-user-id',
      name: 'Development User',
      email: 'dev@example.com',
      role: 'admin'
    };
    
    // For development, we'll use the admin user ID you provided earlier
    req.user.id = '2a993460-a0d6-43c0-af36-f055e43e3c2a';
    
    // Set a fake token for development
    req.token = 'dev-token';
    return next();
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    console.log('No token provided - not authorized');
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devjwtsecret123');

    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      console.log('User not found for token');
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    // Store the token for Supabase authentication
    req.token = token;
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Bypass role check in development mode
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`User with role ${req.user.role} attempted to access restricted route requiring: ${roles.join(', ')}`);
      return res.status(403).json({ 
        success: false, 
        error: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};