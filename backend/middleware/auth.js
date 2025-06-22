const jwt = require('jsonwebtoken');
// --- Database Integration (Uncomment and set up your User model) ---
// const User = require('../models/User'); // Assuming User model is in backend/models/User.js

// --- Mock User Data (TEMPORARY - to be replaced by DB) ---
// This mock data is used if User model is commented out or not ready.
const mockUsers = [
  {
    id: 1,
    email: 'admin@sacco.com',
    role: 'admin',
    isActive: true // Added isActive for requireActiveAccount middleware
  },
  {
    id: 2,
    email: 'manager@sacco.com',
    role: 'manager',
    isActive: true
  }
];

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // --- Replace with DB query ---
    // const user = await User.findByPk(decoded.user.id);
    const user = mockUsers.find(u => u.id === decoded.user.id); // Using mock data

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or token is invalid' // More specific message
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    // Be careful with error messages in production for security
    res.status(401).json({
      success: false,
      error: 'Token is not valid or expired' // More specific message
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated for authorization check'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check if user owns the resource or has admin role
// This is a powerful, generic middleware that needs a 'model' attached to req
const requireOwnershipOrAdmin = (resourceIdParam = 'id', modelName = 'Report') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not authenticated for ownership check' });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // --- Database Integration (This part needs a database model to work) ---
      // This part assumes you will pass a Sequelize model (e.g., req.model = Report;)
      // or fetch based on the modelName
      // Example if using a global models object or dynamic import:
      // const Model = require('../models')[modelName];
      // if (!Model) { throw new Error(`Model ${modelName} not found for ownership check`); }
      // const resource = await Model.findByPk(resourceId);

      // --- TEMPORARY Mock for ownership check (Needs real DB for proper check) ---
      // This mock is highly simplistic and won't work for real ownership
      // For reports, it would mean the report's 'generatedBy' matches req.user.id
      const resource = mockReports.find(r => r.id === parseInt(resourceId)); // Assuming mockReports is available or passed

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Adjust this based on your resource's foreign key for user
      if (resource.generatedBy !== req.user.id) {
          return res.status(403).json({
              success: false,
              message: 'Access denied. You do not own this resource.'
          });
      }
      // --- END TEMPORARY Mock ---

      next();
    } catch (error) {
      console.error('requireOwnershipOrAdmin error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        error: error.message
      });
    }
  };
};

// Middleware to check if user account is active
const requireActiveAccount = (req, res, next) => {
  if (!req.user || !req.user.isActive) { // Check if req.user exists and then if isActive is true
    return res.status(403).json({
      success: false,
      message: 'Account is deactivated'
    });
  }
  next();
};

// Middleware to log API access
const logAccess = (req, res, next) => {
  const startTime = Date.now();

  // Store original json to avoid infinite loop
  const originalJson = res.json;

  res.json = function(data) {
    const duration = Date.now() - startTime;

    // Log the access (you can store this in database or file)
    // console.log can be noisy, consider a dedicated logger
    // console.log({
    //   timestamp: new Date().toISOString(),
    //   method: req.method,
    //   url: req.originalUrl,
    //   userId: req.user?.id || 'anonymous', // Use optional chaining for safety
    //   userEmail: req.user?.email || 'anonymous',
    //   statusCode: res.statusCode,
    //   duration: `${duration}ms`,
    //   ip: req.ip,
    //   userAgent: req.get('User-Agent')
    // });

    return originalJson.call(this, data);
  };

  next();
};

// Middleware to validate API key for external integrations
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  try {
    // In a real application, you'd validate against stored API keys
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || []; // Ensure VALID_API_KEYS in .env
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key'
      });
    }

    // You might want to identify which service is making the request
    req.apiClient = {
      key: apiKey,
      type: 'external'
    };

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      success: false,
      message: 'API key validation failed'
    });
  }
};

// Rate limiting middleware (basic implementation)
// This is already defined in your ratelimiter.js, so not exported here again.
// const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => { /* ... */ };

// Export all middleware functions
module.exports = {
  auth,
  authorize,
  requireOwnershipOrAdmin,
  requireActiveAccount,
  logAccess,
  validateApiKey
  // createRateLimit is not exported here as it's a factory function for a limiter,
  // and specific limiters are exported from ratelimiter.js
};