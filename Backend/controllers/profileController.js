const Profile = require('../models/Profile');
const User = require('../models/User');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Get user basic info
    const user = await User.findById(req.user.id).select('-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpire');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get extended profile info
    let profile = await Profile.findOne({ user: req.user.id });
    
    if (!profile) {
      // Create a new profile with basic user info
      profile = await Profile.create({
        user: req.user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        dob: user.dob
      });
    }
    
    res.status(200).json({
      success: true,
      profile: {
        ...profile.toObject(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        dob: user.dob
      }
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve profile',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = { ...req.body };
    
    console.log('Profile update request for user:', userId);
    console.log('Update data received:', updateData);
    
    // Extract user model fields
    const userFields = {};
    if (updateData.firstName) userFields.firstName = updateData.firstName;
    if (updateData.lastName) userFields.lastName = updateData.lastName;
    if (updateData.dob) userFields.dob = updateData.dob;
    
    // Remove user model fields from profile data
    delete updateData.firstName;
    delete updateData.lastName;
    delete updateData.email; // Never update email through profile
    
    // Ensure user field is set for profile
    updateData.user = userId;
    
    // Update user model if needed
    let updatedUserData = null;
    if (Object.keys(userFields).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        userId, 
        userFields, 
        { new: true, runValidators: true }
      ).select('-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpire');
      
      if (updatedUser) {
        updatedUserData = updatedUser;
        console.log('User model updated:', userFields);
      }
    }
    
    // Clean up profile data - remove empty values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('Cleaned profile data:', updateData);
    
    // Update or create profile
    let profile = await Profile.findOneAndUpdate(
      { user: userId },
      updateData,
      { 
        new: true, 
        upsert: true, // Create if doesn't exist
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
    
    console.log('Profile updated successfully');
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: profile,
      userData: updatedUserData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('Validation errors:', validationErrors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists for this user',
        error: 'Duplicate profile entry'
      });
    }
    
    // Handle cast errors (invalid data types)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        error: `Invalid ${error.path}: ${error.value}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Could not update profile',
      error: error.message
    });
  }
};

// Delete user profile (optional - for account deletion)
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete profile
    await Profile.findOneAndDelete({ user: userId });
    
    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Could not delete profile',
      error: error.message
    });
  }
};

// Get profile completion percentage
exports.getProfileCompletion = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user and profile data
    const user = await User.findById(userId).select('-password -otp -otpExpiry -resetPasswordToken -resetPasswordExpire');
    const profile = await Profile.findOne({ user: userId });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Define required fields for profile completion
    const requiredFields = [
      'firstName', 'lastName', 'email', 'gender', 'dob', 'bloodGroup',
      'district', 'state', 'pincode', 'currentStatus', 'collegeName',
      'courseName', 'sleepPattern', 'exerciseHabit', 'mentalHealthCondition'
    ];
    
    let completedFields = 0;
    
    // Check user model fields
    if (user.firstName) completedFields++;
    if (user.lastName) completedFields++;
    if (user.email) completedFields++;
    if (user.dob) completedFields++;
    
    // Check profile fields
    if (profile) {
      requiredFields.slice(4).forEach(field => {
        if (profile[field]) completedFields++;
      });
    }
    
    const completionPercentage = Math.round((completedFields / requiredFields.length) * 100);
    
    res.status(200).json({
      success: true,
      completionPercentage,
      completedFields,
      totalFields: requiredFields.length,
      missingFields: requiredFields.filter(field => {
        if (['firstName', 'lastName', 'email', 'dob'].includes(field)) {
          return !user[field];
        }
        return !profile || !profile[field];
      })
    });
  } catch (error) {
    console.error('Error calculating profile completion:', error);
    res.status(500).json({
      success: false,
      message: 'Could not calculate profile completion',
      error: error.message
    });
  }
};