const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  }
};

// Check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user owns the resource or has admin role
const requireOwnershipOrAdmin = (resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if the resource belongs to the user
      // This is a generic check - you might need to customize based on your models
      const resource = await req.model.findByPk(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      if (resource.createdBy !== req.user.id && resource.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      next();
    } catch (error) {
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
  if (!req.user.isActive) {
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
  
  // Override res.json to capture response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    // Log the access (you can store this in database or file)
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.id,
      userEmail: req.user?.email,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
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
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
    
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
    res.status(500).json({
      success: false,
      message: 'API key validation failed'
    });
  }
};

// Rate limiting middleware (basic implementation)
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user?.id || 'anonymous');
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of requests.entries()) {
      if (now - v.timestamp > windowMs) {
        requests.delete(k);
      }
    }

    const userRequests = requests.get(key) || { count: 0, timestamp: now };
    
    if (now - userRequests.timestamp > windowMs) {
      userRequests.count = 0;
      userRequests.timestamp = now;
    }

    userRequests.count++;
    requests.set(key, userRequests);

    if (userRequests.count > max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        retryAfter: Math.ceil((windowMs - (now - userRequests.timestamp)) / 1000)
      });
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - userRequests.count));
    res.setHeader('X-RateLimit-Reset', new Date(userRequests.timestamp + windowMs));

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin,
  requireActiveAccount,
  logAccess,
  validateApiKey,
  createRateLimit
};