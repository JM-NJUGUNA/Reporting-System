const { body, param, query, validationResult } = require('express-validator');

// Generic validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('role').optional().isIn(['user', 'manager', 'admin']).withMessage('Invalid role'),
  handleValidationErrors
];

// Report validation rules
const validateReport = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('type').isIn(['monthly', 'quarterly', 'annual', 'custom']).withMessage('Invalid report type'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('template').optional().isString().withMessage('Template must be a string'),
  handleValidationErrors
];

// Report ID validation
const validateReportId = [
  param('id').isInt({ min: 1 }).withMessage('Report ID must be a positive integer'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Date range validation
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
  handleValidationErrors
];

// File upload validation
const validateFileUpload = [
  body('file').optional().isObject().withMessage('File must be provided'),
  body('file.mimetype').optional().isIn(['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']).withMessage('Invalid file type'),
  body('file.size').optional().isInt({ max: 10 * 1024 * 1024 }).withMessage('File size must be less than 10MB'),
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q').optional().trim().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('type').optional().isIn(['title', 'content', 'all']).withMessage('Invalid search type'),
  handleValidationErrors
];

// Email validation
const validateEmail = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  handleValidationErrors
];

// Password validation
const validatePassword = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateReport,
  validateReportId,
  validatePagination,
  validateDateRange,
  validateFileUpload,
  validateSearch,
  validateEmail,
  validatePassword
};
