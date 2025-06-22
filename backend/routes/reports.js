const express = require('express');
const { body, validationResult } = require('express-validator'); // Keep these, as you use them internally
const router = express.Router();

// --- Database Integration (Upgrade from Mock Data) ---
// Assuming you have a Report model defined in ../models/Report
// const Report = require('../models/Report');

// --- Mock Reports Data (TEMPORARY - to be replaced by DB) ---
// Renamed 'reports' to 'mockReports' for clarity
let mockReports = [
  {
    id: 1,
    title: 'Monthly SASRA Compliance Report - January 2024',
    type: 'monthly',
    status: 'completed',
    generatedBy: 1, // This should reference a user ID from your DB
    generatedAt: new Date('2024-01-31'),
    data: {
      totalMembers: 2847,
      totalAssets: 45200000,
      totalLiabilities: 32000000,
      netWorth: 13200000,
      complianceScore: 95.2
    },
    fileUrl: '/reports/monthly-jan-2024.pdf'
  },
  {
    id: 2,
    title: 'Quarterly Financial Report - Q4 2023',
    type: 'quarterly',
    status: 'pending',
    generatedBy: 2, // This should reference a user ID from your DB
    generatedAt: new Date('2024-01-15'),
    data: {
      totalMembers: 2800,
      totalAssets: 44000000,
      totalLiabilities: 31500000,
      netWorth: 12500000,
      complianceScore: 92.8
    },
    fileUrl: null
  }
];

// --- Import Validation & Rate Limiter Middleware ---
const { validateReport, validateReportId, validatePagination, handleValidationErrors } = require('../middleware/validation');
const { reportGenerationLimiter } = require('../middleware/ratelimiter'); // Import reportGenerationLimiter
// The 'auth' middleware is applied in app.js for all /api/reports routes.

// @route   GET /api/reports/stats/overview
// @desc    Get reports statistics
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    // --- Replace with DB Aggregation/Count Queries ---
    // const totalReports = await Report.count();
    // const completedReports = await Report.count({ where: { status: 'completed' } });
    // ... etc. using ORM methods
    const totalReports = mockReports.length;
    const completedReports = mockReports.filter(r => r.status === 'completed').length;
    const pendingReports = mockReports.filter(r => r.status === 'pending').length;
    const generatingReports = mockReports.filter(r => r.status === 'generating').length;

    const monthlyReports = mockReports.filter(r => r.type === 'monthly').length;
    const quarterlyReports = mockReports.filter(r => r.type === 'quarterly').length;
    const annualReports = mockReports.filter(r => r.type === 'annual').length;

    const avgComplianceScore = mockReports
      .filter(r => r.data && typeof r.data.complianceScore === 'number') // Ensure data.complianceScore exists and is a number
      .reduce((sum, r) => sum + r.data.complianceScore, 0) /
      mockReports.filter(r => r.data && typeof r.data.complianceScore === 'number').length || 0;

    res.json({
      success: true,
      data: {
        totalReports,
        statusBreakdown: {
          completed: completedReports,
          pending: pendingReports,
          generating: generatingReports
        },
        typeBreakdown: {
          monthly: monthlyReports,
          quarterly: quarterlyReports,
          annual: annualReports
        },
        averageComplianceScore: Math.round(avgComplianceScore * 100) / 100
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});


// @route   GET /api/reports
// @desc    Get all reports
// @access  Private
router.get('/', validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status } = req.query;

    let filteredReports = [...mockReports]; // Using mock data for now

    // Filter by type
    if (type) {
      filteredReports = filteredReports.filter(report => report.type === type);
    }

    // Filter by status
    if (status) {
      filteredReports = filteredReports.filter(report => report.status === status);
    }

    // Sort by generatedAt (newest first)
    filteredReports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = parseInt(page) * parseInt(limit);
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredReports.length / parseInt(limit)),
          totalReports: filteredReports.length,
          hasNextPage: endIndex < filteredReports.length,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Get report by ID
// @access  Private
router.get('/:id', validateReportId, handleValidationErrors, async (req, res) => {
  try {
    // --- Replace with DB query ---
    // const report = await Report.findByPk(req.params.id);
    const report = mockReports.find(r => r.id === parseInt(req.params.id));

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/reports
// @desc    Create new report
// @access  Private
router.post('/', validateReport, handleValidationErrors, async (req, res) => {
  try {
    const { title, type, data, template } = req.body;

    const newReportObj = {
      title,
      type,
      status: 'pending',
      generatedBy: req.user.id, // Assuming req.user is populated by 'auth' middleware
      generatedAt: new Date(),
      data: data || {},
      template: template || 'default',
      fileUrl: null
    };

    // --- Replace with DB insertion ---
    // const newReport = await Report.create(newReportObj);
    const newReport = { ...newReportObj, id: mockReports.length + 1 }; // Add ID for mock
    mockReports.push(newReport); // Add to mock data

    res.status(201).json({
      success: true,
      data: newReport
    });

  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   PUT /api/reports/:id
// @desc    Update report
// @access  Private
router.put('/:id', validateReportId, validateReport, handleValidationErrors, async (req, res) => {
  try {
    // --- Replace with DB update ---
    // const report = await Report.findByPk(req.params.id);
    const reportIndex = mockReports.findIndex(r => r.id === parseInt(req.params.id));

    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const { title, type, data, status } = req.body;

    // Apply updates (in mock data or via ORM)
    mockReports[reportIndex] = {
      ...mockReports[reportIndex],
      title: title || mockReports[reportIndex].title,
      type: type || mockReports[reportIndex].type,
      data: data || mockReports[reportIndex].data,
      status: status || mockReports[reportIndex].status,
      updatedAt: new Date()
    };
    // if (report) { await report.update(req.body); } // If using ORM

    res.json({
      success: true,
      data: mockReports[reportIndex]
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE /api/reports/:id
// @desc    Delete report
// @access  Private
router.delete('/:id', validateReportId, handleValidationErrors, async (req, res) => {
  try {
    // --- Replace with DB deletion ---
    // const deletedRows = await Report.destroy({ where: { id: req.params.id } });
    const reportIndex = mockReports.findIndex(r => r.id === parseInt(req.params.id));

    if (reportIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const deletedReport = mockReports.splice(reportIndex, 1)[0];

    res.json({
      success: true,
      message: 'Report deleted successfully',
      data: deletedReport
    });

  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   POST /api/reports/:id/generate
// @desc    Generate report file
// @access  Private
router.post('/:id/generate', validateReportId, reportGenerationLimiter, handleValidationErrors, async (req, res) => {
  try {
    // --- Replace with DB query ---
    // const report = await Report.findByPk(req.params.id);
    const report = mockReports.find(r => r.id === parseInt(req.params.id));

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Simulate report generation process
    report.status = 'generating';
    // If using DB: await report.update({ status: 'generating' });

    // Simulate work, then update status and notify client via Socket.io
    const ioInstance = req.app.get('socketio'); // Get socket.io instance from app
    setTimeout(async () => { // Make async to allow DB update if needed
      report.status = 'completed';
      report.fileUrl = `/reports/${report.type}-${Date.now()}.pdf`;
      report.completedAt = new Date();
      // If using DB: await report.update({ status: 'completed', fileUrl: ..., completedAt: ... });

      // Notify the user via Socket.io (assuming userId is available)
      if (ioInstance && report.generatedBy) {
          ioInstance.to(`user_${report.generatedBy}`).emit('report_update', {
              reportId: report.id,
              status: 'completed',
              fileUrl: report.fileUrl,
              message: `Report "${report.title}" completed!`
          });
      }
      console.log(`Report ${report.id} generation completed.`);
    }, 5000); // Simulate 5-second generation time

    res.json({
      success: true,
      message: 'Report generation started',
      data: {
        reportId: report.id,
        status: 'generating',
        estimatedTime: '5 seconds'
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});


module.exports = router;