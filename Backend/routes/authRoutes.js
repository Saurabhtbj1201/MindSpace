const express = require('express');
const {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const router = express.Router();

// Auth routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

module.exports = router;
