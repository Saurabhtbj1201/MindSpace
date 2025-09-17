const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  analyzeMentalHealth,
  getMentalHealthReports,
  getMentalHealthReport,
  emailMentalHealthReport,
  downloadReportPDF,
  saveModuleProgress,
  getModuleProgress,
  clearModuleProgress
} = require('../controllers/mentalHealthController');

const router = express.Router();

// Protect all routes
router.use(protect);

// @route   POST /api/mental-health/analyze
// @desc    Analyze mental health data and generate report
// @access  Private
router.post('/analyze', analyzeMentalHealth);

// @route   GET /api/mental-health/reports
// @desc    Get user's mental health reports
// @access  Private
router.get('/reports', getMentalHealthReports);

// @route   GET /api/mental-health/reports/:id
// @desc    Get specific mental health report
// @access  Private
router.get('/reports/:id', getMentalHealthReport);

// @route   POST /api/mental-health/email-report
// @desc    Email mental health report to user
// @access  Private
router.post('/email-report', emailMentalHealthReport);

// @route   GET /api/mental-health/reports/:id/pdf
// @desc    Download mental health report as PDF
// @access  Private
router.get('/reports/:id/pdf', downloadReportPDF);

// @route   GET /api/mental-health/progress
// @desc    Get module progress for user
// @access  Private
router.get('/progress', getModuleProgress);

// @route   POST /api/mental-health/progress
// @desc    Save module progress for user
// @access  Private
router.post('/progress', saveModuleProgress);

// @route   DELETE /api/mental-health/progress/clear
// @desc    Clear all module progress for user
// @access  Private
router.delete('/progress/clear', clearModuleProgress);

module.exports = router;
