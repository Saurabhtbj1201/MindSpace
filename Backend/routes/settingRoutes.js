const express = require('express');
const {
    getAccountInfo,
    requestEmailChange,
    verifyEmailChange,
    resendEmailOTP,
    changePassword,
    deleteAccount
} = require('../controllers/settingsController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected - require authentication
router.use(protect);

// @route   GET /api/settings/account-info
// @desc    Get account information
// @access  Private
router.get('/account-info', getAccountInfo);

// @route   POST /api/settings/change-email
// @desc    Request email change with OTP
// @access  Private
router.post('/change-email', requestEmailChange);

// @route   POST /api/settings/verify-email-change
// @desc    Verify email change with OTP
// @access  Private
router.post('/verify-email-change', verifyEmailChange);

// @route   POST /api/settings/resend-email-otp
// @desc    Resend email change OTP
// @access  Private
router.post('/resend-email-otp', resendEmailOTP);

// @route   PUT /api/settings/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', changePassword);

// @route   DELETE /api/settings/delete-account
// @desc    Delete account
// @access  Private
router.delete('/delete-account', deleteAccount);

module.exports = router;