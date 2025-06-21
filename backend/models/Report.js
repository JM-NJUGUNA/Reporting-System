const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { Report, ReportTemplate, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateReport } = require('../services/reportGenerator');
const { uploadToStorage } = require('../services/fileService');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only Excel, CSV, and PDF files are allowed'));
    }
  }
});

// Get all reports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, dateFrom, dateTo } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (dateFrom && dateTo) {
      whereClause.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      };
    }

    const reports = await Report.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: reports.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: reports.count,
        pages: Math.ceil(reports.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
});

// Create new report
router.post('/', 
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('type').isIn(['financial', 'compliance', 'operational', 'custom']).withMessage('Invalid report type'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { title, type, description, templateId, parameters } = req.body;

      const report = await Report.create({
        title,
        type,
        description,
        templateId,
        parameters: JSON.stringify(parameters),
        createdBy: req.user.id,
        status: 'pending'
      });

      // Log activity
      await logActivity(req.user.id, 'report_created', {
        reportId: report.id,
        title: report.title
      });

      // Start report generation in background
      generateReport(report.id).catch(console.error);

      res.status(201).json({
        success: true,
        message: 'Report creation initiated',
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating report',
        error: error.message
      });
    }
  }
);

// Get specific report
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
});

// Update report
router.put('/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('status').optional().isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const report = await Report.findByPk(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      await report.update(req.body);

      await logActivity(req.user.id, 'report_updated', {
        reportId: report.id,
        changes: req.body
      });

      res.json({
        success: true,
        message: 'Report updated successfully',
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating report',
        error: error.message
      });
    }
  }
);

// Delete report
router.delete('/:id',
  authenticateToken,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const report = await Report.findByPk(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      await report.destroy();

      await logActivity(req.user.id, 'report_deleted', {
        reportId: req.params.id,
        title: report.title
      });

      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting report',
        error: error.message
      });
    }
  }
);

// Upload data file for report
router.post('/:id/upload',
  authenticateToken,
  upload.single('dataFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const report = await Report.findByPk(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Process uploaded file
      const fileUrl = await uploadToStorage(req.file);
      
      await report.update({
        dataFile: fileUrl,
        status: 'processing'
      });

      await logActivity(req.user.id, 'file_uploaded', {
        reportId: report.id,
        filename: req.file.originalname
      });

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.originalname,
          url: fileUrl
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error uploading file',
        error: error.message
      });
    }
  }
);

// Download report
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'completed' || !report.outputFile) {
      return res.status(400).json({
        success: false,
        message: 'Report not ready for download'
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${report.title}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Stream the file
    const fs = require('fs');
    const filePath = path.join(__dirname, '../', report.outputFile);
    
    if (fs.existsSync(filePath)) {
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      await logActivity(req.user.id, 'report_downloaded', {
        reportId: report.id
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Report file not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading report',
      error: error.message
    });
  }
});

module.exports = router;