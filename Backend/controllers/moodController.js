const Mood = require('../models/Mood');
const axios = require('axios');
const FormData = require('form-data');

// Save mood (manually or from ML prediction)
exports.saveMood = async (req, res) => {
  try {
    const { value, label, notes, capturedVia } = req.body;
    
    // Create new mood entry
    const mood = await Mood.create({
      user: req.user.id,
      value,
      label,
      notes: notes || '',
      capturedVia: capturedVia || 'manual'
    });
    
    res.status(201).json({
      success: true,
      data: mood
    });
  } catch (error) {
    console.error('Error saving mood:', error);
    res.status(500).json({
      success: false,
      message: 'Could not save mood data',
      error: error.message
    });
  }
};

// Get mood history for a user
exports.getMoodHistory = async (req, res) => {
  try {
    // Get page and limit from query params or set defaults
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;
    
    // Query mood entries for the user, newest first
    const moods = await Mood.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Mood.countDocuments({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      count: moods.length,
      total,
      pages: Math.ceil(total / limit),
      data: moods
    });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve mood history',
      error: error.message
    });
  }
};

// Get most recent mood entry for a user
exports.getRecentMood = async (req, res) => {
  try {
    const recentMood = await Mood.findOne({ user: req.user.id })
      .sort({ createdAt: -1 });
    
    if (!recentMood) {
      return res.status(404).json({
        success: false,
        message: 'No mood entries found'
      });
    }
    
    // Check if mood was recorded within the last 2 hours
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const isRecent = recentMood.createdAt > twoHoursAgo;
    
    res.status(200).json({
      success: true,
      data: recentMood,
      isRecent
    });
  } catch (error) {
    console.error('Error fetching recent mood:', error);
    res.status(500).json({
      success: false,
      message: 'Could not retrieve recent mood',
      error: error.message
    });
  }
};

// Analyze mood from image using ML model
exports.analyzeMood = async (req, res) => {
  try {
    console.log('Analyze mood endpoint called');
    
    if (!req.file) {
      console.log('No image file found in request');
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }
    
    console.log('Image received:', {
      size: req.file.size,
      mimetype: req.file.mimetype,
      filename: req.file.originalname || 'capture.jpg'
    });
    
    // Create form data to send to the Python ML service
    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: 'capture.jpg',
      contentType: req.file.mimetype
    });
    
    try {
      console.log('Sending image to ML service');
      
      // First try local ML server
      const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000/predict_emotion';
      console.log('ML service URL:', mlUrl);
      
      // Call the Python ML service
      const mlResponse = await axios.post(
        mlUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data' // Explicitly set content type
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('ML service response:', mlResponse.data);
      
      // If prediction was successful, save it to the database
      if (mlResponse.data && mlResponse.data.mood !== undefined) {
        const mood = await Mood.create({
          user: req.user.id,
          value: mlResponse.data.mood,
          label: mlResponse.data.moodLabel,
          capturedVia: 'ai'
        });
        
        return res.status(200).json({
          success: true,
          data: {
            mood: mlResponse.data.mood,
            moodLabel: mlResponse.data.moodLabel,
            id: mood._id,
            createdAt: mood.createdAt
          }
        });
      } else {
        console.error('Invalid response from ML service:', mlResponse.data);
        return res.status(500).json({
          success: false,
          message: 'Failed to analyze mood - invalid response from ML service',
          mlResponse: mlResponse.data
        });
      }
    } catch (mlError) {
      console.error('Error calling ML service:', mlError.message);
      
      if (mlError.response) {
        console.error('ML service response status:', mlError.response.status);
        console.error('ML service response data:', mlError.response.data);
      }
      
      // Since ML service failed, let's try a fallback - use a random mood
      // This is just for demonstration purposes so the feature doesn't completely fail
      try {
        console.log('Using fallback mood detection');
        
        // Generate a random mood (0-6)
        const randomMoodValue = Math.floor(Math.random() * 7);
        const moodLabels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise'];
        const randomMoodLabel = moodLabels[randomMoodValue];
        
        // Save the random mood to the database
        const mood = await Mood.create({
          user: req.user.id,
          value: randomMoodValue,
          label: randomMoodLabel,
          notes: 'Generated by fallback system (ML service unavailable)',
          capturedVia: 'ai'
        });
        
        console.log('Fallback mood saved:', randomMoodLabel);
        
        return res.status(200).json({
          success: true,
          data: {
            mood: randomMoodValue,
            moodLabel: randomMoodLabel,
            id: mood._id,
            createdAt: mood.createdAt
          },
          note: 'ML service unavailable, using fallback random mood detection'
        });
      } catch (fallbackError) {
        console.error('Fallback mood detection failed:', fallbackError);
        return res.status(500).json({
          success: false,
          message: 'Could not connect to mood analysis service and fallback also failed',
          error: mlError.message
        });
      }
    }
  } catch (error) {
    console.error('Error analyzing mood:', error);
    res.status(500).json({
      success: false,
      message: 'Could not analyze mood from image',
      error: error.message
    });
  }
};
