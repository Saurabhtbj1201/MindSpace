const User = require('../models/User');
const Profile = require('../models/Profile');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// @desc    Get account information
// @route   GET /api/settings/account-info  
// @access  Private
const getAccountInfo = async (req, res) => {
    try {
        console.log('Getting account info for user:', req.user.id);
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User found:', user.email);
        res.status(200).json({
            success: true,
            accountInfo: {
                email: user.email,
                createdAt: user.createdAt,
                lastPasswordChange: user.lastPasswordChange,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error('Error getting account info:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Request email change with OTP
// @route   POST /api/auth/change-email
// @access  Private
const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        
        if (!newEmail) {
            return res.status(400).json({
                success: false,
                message: 'New email is required'
            });
        }

        // Check if email is already in use
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email is already in use'
            });
        }

        // Get current user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate OTP for email verification
        const otp = user.generateOTP();
        await user.save();

        // Send OTP email to new email address
        const sendEmail = require('../utils/emailService');
        const emailResult = await sendEmail({
            to: newEmail,
            subject: 'MindSpace - Email Change Verification',
            text: `Your email change verification OTP is: ${otp}. This OTP is valid for 10 minutes.`
        });

        if (!emailResult.success) {
            console.error('Failed to send email change OTP:', emailResult.error);
        }

        // Always return success in development mode for testing
        console.log(`Email change OTP for ${newEmail}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'Verification code sent to new email address'
        });
    } catch (error) {
        console.error('Error requesting email change:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Verify email change with OTP
// @route   POST /api/auth/verify-email-change
// @access  Private
const verifyEmailChange = async (req, res) => {
    try {
        const { newEmail, otp } = req.body;
        
        if (!newEmail || !otp) {
            return res.status(400).json({
                success: false,
                message: 'New email and OTP are required'
            });
        }

        // Hash the provided OTP
        const hashedOTP = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        // Find user with matching OTP and check expiry
        const user = await User.findOne({
            _id: req.user.id,
            verificationToken: hashedOTP,
            verificationExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Check if new email is still available
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Email is already in use'
            });
        }

        // Update user email
        const oldEmail = user.email;
        user.email = newEmail;
        user.verificationToken = undefined;
        user.verificationExpire = undefined;
        await user.save();

        // Update email in profile if exists
        await Profile.findOneAndUpdate(
            { user: user._id },
            { email: newEmail }
        );

        res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            userData: {
                email: newEmail
            }
        });
    } catch (error) {
        console.error('Error verifying email change:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Resend email change OTP
// @route   POST /api/auth/resend-email-otp
// @access  Private
const resendEmailOTP = async (req, res) => {
    try {
        const { newEmail } = req.body;
        
        if (!newEmail) {
            return res.status(400).json({
                success: false,
                message: 'New email is required'
            });
        }

        // Get current user
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is still available
        const existingUser = await User.findOne({ email: newEmail });
        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Email is no longer available'
            });
        }

        // Generate new OTP
        const otp = user.generateOTP();
        await user.save();

        // Send OTP email to new email address
        const sendEmail = require('../utils/emailService');
        const emailResult = await sendEmail({
            to: newEmail,
            subject: 'MindSpace - Email Change Verification (Resend)',
            text: `Your email change verification OTP is: ${otp}. This OTP is valid for 10 minutes.`
        });

        if (!emailResult.success) {
            console.error('Failed to resend email change OTP:', emailResult.error);
        }

        // Always return success in development mode for testing
        console.log(`Resend email change OTP for ${newEmail}: ${otp}`);

        res.status(200).json({
            success: true,
            message: 'Verification code sent again'
        });
    } catch (error) {
        console.error('Error resending email OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check current password
        const isCurrentPasswordValid = await user.matchPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check if new password is different from current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete account
// @route   DELETE /api/auth/delete-account
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify password
        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Delete user's profile
        await Profile.findOneAndDelete({ user: user._id });

        // Delete any other related data here (mood entries, etc.)
        // TODO: Add cleanup for other collections

        // Delete user account
        await User.findByIdAndDelete(user._id);

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

module.exports = {
    getAccountInfo,
    requestEmailChange,
    verifyEmailChange,
    resendEmailOTP,
    changePassword,
    deleteAccount
};