const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// --- Database Integration (Upgrade from Mock Data) ---
// Assuming you have a User model defined in ../models/User
// You'll need to uncomment this once your models are set up.
// const User = require('../models/User');

// --- Mock User Data (TEMPORARY - to be replaced by DB) ---
// This mock data is crucial for the app to run initially without a DB.
// It matches the structure of your previous mock users but will be removed.
let mockUsers = [
  {
    id: 1,
    email: 'admin@sacco.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    position: 'System Administrator',
    createdAt: new Date(),
    lastLogin: new Date()
  },
  {
    id: 2,
    email: 'manager@sacco.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password123
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    department: 'Operations',
    position: 'Operations Manager',
    createdAt: new Date(),
    lastLogin: new Date()
  }
];

// --- Import Validation Middleware (from your validation.js) ---
const { validateUser, validateEmail, validatePassword, handleValidationErrors } = require('../middleware/validation');
const { authLimiter } = require('../middleware/ratelimiter'); // Import authLimiter

// Validation middleware (retained for clarity, though you have validateLogin in validation.js)
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Replace with DB query ---
    // const user = await User.findOne({ where: { email } });
    const user = mockUsers.find(u => u.email === email); // Using mock data

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login (in mock data or DB)
    user.lastLogin = new Date();
    // if (User) { await user.save(); } // If using a database ORM

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (should be restricted in production, e.g., only by admin)
router.post('/register', authLimiter, validateUser, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department, position } = req.body;

    // --- Replace with DB query ---
    // const existingUser = await User.findOne({ where: { email } });
    const existingUser = mockUsers.find(u => u.email === email); // Using mock data

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user object
    const newUserObj = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'user', // Default role
      department: department || 'General',
      position: position || 'Member',
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // --- Replace with DB insertion ---
    // const newUser = await User.create(newUserObj);
    const newUser = { ...newUserObj, id: mockUsers.length + 1 }; // Add ID for mock
    mockUsers.push(newUser); // Add to mock data

    // Create JWT payload
    const payload = {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    };

    // Sign token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
// This route will use the 'auth' middleware from auth.js, which populates req.user
router.get('/me', async (req, res) => {
  try {
    // req.user is populated by the 'auth' middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated by middleware'
      });
    }

    // In a real app, you might re-fetch user from DB to ensure latest data:
    // const user = await User.findByPk(req.user.id);
    // if (!user) { return res.status(401).json({ success: false, error: 'User not found in DB' }); }

    // Using the user object already attached by the 'auth' middleware
    const userResponse = { ...req.user };
    delete userResponse.password; // Ensure password isn't sent even if it somehow got attached

    res.json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Auth /me error:', error);
    res.status(500).json({ // Changed status to 500 for server errors, 401 for auth issues
      success: false,
      error: 'Server error fetching user details'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', (req, res) => {
  // For JWT, logout is client-side: just discard the token.
  // This endpoint can be used to clear server-side session/cookies if used.
  res.json({
    success: true,
    message: 'Logged out successfully (token needs to be removed client-side)'
  });
});

module.exports = router;