const MentalHealthReport = require('../models/MentalHealthReport');
const User = require('../models/User');
const Profile = require('../models/Profile');
const sendEmail = require('../utils/emailService');

// @desc    Analyze mental health data and generate report
// @route   POST /api/mental-health/analyze
// @access  Private
const analyzeMentalHealth = async (req, res) => {
  try {
    const { vitals, lifestyle, dass21, gad7, phq9 } = req.body;
    
    // Validate required data
    if (!vitals || !dass21 || !gad7 || !phq9) {
      return res.status(400).json({
        success: false,
        message: 'Missing required assessment data'
      });
    }
    
    // Validate vitals data
    if (!vitals.systolic || !vitals.diastolic || !vitals.heartRate || !vitals.sleepDuration) {
      return res.status(400).json({
        success: false,
        message: 'Missing required vital signs data'
      });
    }
    
    // Process and validate temperature (convert Fahrenheit to Celsius if needed)
    let processedVitals = { ...vitals };
    if (processedVitals.temperature) {
      // If temperature seems to be in Fahrenheit (> 50), convert to Celsius
      if (processedVitals.temperature > 50) {
        processedVitals.temperature = ((processedVitals.temperature - 32) * 5) / 9;
        processedVitals.temperature = Math.round(processedVitals.temperature * 10) / 10; // Round to 1 decimal
      }
      
      // Validate temperature range (now in Celsius)
      if (processedVitals.temperature < 35 || processedVitals.temperature > 42) {
        return res.status(400).json({
          success: false,
          message: 'Temperature value is out of valid range'
        });
      }
    }
    
    // Validate DASS-21 scores
    if (!dass21.depression || !dass21.anxiety || !dass21.stress) {
      return res.status(400).json({
        success: false,
        message: 'Invalid DASS-21 assessment data'
      });
    }
    
    // Validate GAD-7 scores
    if (typeof gad7.score !== 'number' || !gad7.severity) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GAD-7 assessment data'
      });
    }
    
    // Validate PHQ-9 scores
    if (typeof phq9.score !== 'number' || !phq9.severity) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PHQ-9 assessment data'
      });
    }
    
    // Calculate overall risk level
    const overallRisk = calculateOverallRisk(dass21, gad7, phq9);
    
    // Generate personalized recommendations
    const recommendations = generateRecommendations(dass21, gad7, phq9, processedVitals, lifestyle);
    
    // Create mental health report
    const reportData = {
      user: req.user.id,
      vitals: processedVitals,
      lifestyle: lifestyle || {},
      dass21,
      gad7,
      phq9,
      overallRisk,
      recommendations
    };
    
    console.log('Creating report with data:', JSON.stringify(reportData, null, 2));
    
    const report = await MentalHealthReport.create(reportData);
    
    // Populate user data for response
    await report.populate('user', 'firstName lastName email');
    
    res.status(201).json({
      success: true,
      message: 'Mental health analysis completed successfully',
      data: report
    });
    
  } catch (error) {
    console.error('Error analyzing mental health:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during analysis',
      error: error.message
    });
  }
};

// @desc    Get user's mental health reports
// @route   GET /api/mental-health/reports
// @access  Private
const getMentalHealthReports = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const reports = await MentalHealthReport.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'firstName lastName email');
    
    const total = await MentalHealthReport.countDocuments({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get specific mental health report
// @route   GET /api/mental-health/reports/:id
// @access  Private
const getMentalHealthReport = async (req, res) => {
  try {
    const report = await MentalHealthReport.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Email mental health report
// @route   POST /api/mental-health/email-report
// @access  Private
const emailMentalHealthReport = async (req, res) => {
  try {
    const { reportId } = req.body;
    
    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required'
      });
    }
    
    const report = await MentalHealthReport.findOne({
      _id: reportId,
      user: req.user.id
    }).populate('user', 'firstName lastName email');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Generate email content
    const emailContent = generateReportEmailContent(report);
    
    // Send email
    const emailResult = await sendEmail({
      to: report.user.email,
      subject: 'Your MindSpace Mental Health Report',
      html: emailContent
    });
    
    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Report sent to your email successfully'
      });
    } else {
      throw new Error('Failed to send email');
    }
    
  } catch (error) {
    console.error('Error emailing report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email'
    });
  }
};

// @desc    Save module progress for a user
// @route   POST /api/mental-health/progress
// @access  Private
const saveModuleProgress = async (req, res) => {
  try {
    const { module, data } = req.body;
    
    if (!module || typeof data === 'undefined') {
      return res.status(400).json({ 
        success: false, 
        message: 'Module and data required' 
      });
    }
    
    // Find or create profile document for user
    let profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      profile = new Profile({ 
        user: req.user.id, 
        moduleProgress: {} 
      });
    }
    
    // Initialize moduleProgress if it doesn't exist
    if (!profile.moduleProgress) {
      profile.moduleProgress = {};
    }
    
    // Save the module data
    profile.moduleProgress[module] = data;
    
    // Mark the field as modified (important for nested objects in Mongoose)
    profile.markModified('moduleProgress');
    
    await profile.save();
    
    res.json({ 
      success: true, 
      message: `${module} progress saved successfully`, 
      progress: profile.moduleProgress 
    });
    
  } catch (error) {
    console.error('Error saving module progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while saving progress',
      error: error.message 
    });
  }
};

// @desc    Get module progress for a user
// @route   GET /api/mental-health/progress
// @access  Private
const getModuleProgress = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    
    const progress = profile?.moduleProgress || {};
    
    res.json({ 
      success: true, 
      progress: progress 
    });
    
  } catch (error) {
    console.error('Error getting module progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching progress',
      error: error.message 
    });
  }
};

// @desc    Clear all module progress for a user
// @route   DELETE /api/mental-health/progress/clear
// @access  Private
const clearModuleProgress = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    
    if (profile) {
      profile.moduleProgress = {};
      profile.markModified('moduleProgress');
      await profile.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Module progress cleared successfully'
    });
    
  } catch (error) {
    console.error('Error clearing module progress:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while clearing progress',
      error: error.message 
    });
  }
};

// Helper function to calculate overall risk
function calculateOverallRisk(dass21, gad7, phq9) {
  const severeCount = [
    dass21.depression.severity,
    dass21.anxiety.severity,
    dass21.stress.severity,
    gad7.severity,
    phq9.severity
  ].filter(severity => severity === 'severe').length;
  
  const moderateCount = [
    dass21.depression.severity,
    dass21.anxiety.severity,
    dass21.stress.severity,
    gad7.severity,
    phq9.severity
  ].filter(severity => severity === 'moderate').length;
  
  if (severeCount >= 2) return 'severe';
  if (severeCount >= 1 || moderateCount >= 3) return 'high';
  if (moderateCount >= 1) return 'moderate';
  return 'low';
}

// Helper function to generate recommendations
function generateRecommendations(dass21, gad7, phq9, vitals, lifestyle) {
  const recommendations = [];
  
  // Depression recommendations
  if (dass21.depression.severity !== 'normal') {
    recommendations.push({
      category: 'Mental Health',
      title: 'Depression Management',
      description: 'Consider mindfulness meditation, regular exercise, and maintaining social connections. Professional counseling may be beneficial.',
      priority: dass21.depression.severity === 'severe' ? 'high' : 'medium'
    });
  }
  
  // Anxiety recommendations
  if (dass21.anxiety.severity !== 'normal' || gad7.severity !== 'normal') {
    recommendations.push({
      category: 'Mental Health',
      title: 'Anxiety Relief',
      description: 'Practice deep breathing exercises, progressive muscle relaxation, and consider limiting caffeine intake.',
      priority: (dass21.anxiety.severity === 'severe' || gad7.severity === 'severe') ? 'high' : 'medium'
    });
  }
  
  // Stress recommendations
  if (dass21.stress.severity !== 'normal') {
    recommendations.push({
      category: 'Mental Health',
      title: 'Stress Management',
      description: 'Implement time management techniques, take regular breaks, and engage in stress-reducing activities like yoga or nature walks.',
      priority: dass21.stress.severity === 'severe' ? 'high' : 'medium'
    });
  }
  
  // Sleep recommendations
  if (vitals.sleepDuration < 7 || vitals.sleepDuration > 9) {
    recommendations.push({
      category: 'Physical Health',
      title: 'Sleep Optimization',
      description: 'Aim for 7-9 hours of sleep per night. Establish a consistent bedtime routine and limit screen time before bed.',
      priority: 'medium'
    });
  }
  
  // Exercise recommendations
  if (!lifestyle.exerciseFrequency || lifestyle.exerciseFrequency === 'never' || lifestyle.exerciseFrequency === 'rarely') {
    recommendations.push({
      category: 'Physical Health',
      title: 'Physical Activity',
      description: 'Start with 30 minutes of moderate exercise 3-4 times per week. Even light walking can significantly improve mental health.',
      priority: 'medium'
    });
  }
  
  // Blood pressure recommendations
  if (vitals.systolic > 140 || vitals.diastolic > 90) {
    recommendations.push({
      category: 'Physical Health',
      title: 'Blood Pressure Management',
      description: 'Your blood pressure is elevated. Consider reducing sodium intake, increasing physical activity, and consulting a healthcare provider.',
      priority: 'high'
    });
  }
  
  // Substance use recommendations
  if (lifestyle.smokingStatus && lifestyle.smokingStatus !== 'never') {
    recommendations.push({
      category: 'Lifestyle',
      title: 'Smoking Cessation',
      description: 'Consider smoking cessation programs. Quitting smoking can significantly improve both physical and mental health.',
      priority: 'high'
    });
  }
  
  // Screen time recommendations
  if (lifestyle.screenTime && lifestyle.screenTime > 8) {
    recommendations.push({
      category: 'Lifestyle',
      title: 'Digital Wellness',
      description: 'Consider reducing screen time and taking regular breaks. Excessive screen time can impact sleep and mental health.',
      priority: 'low'
    });
  }
  
  // Emergency recommendations for severe cases
  const hasSevereSymptoms = [
    dass21.depression.severity,
    dass21.anxiety.severity,
    dass21.stress.severity,
    gad7.severity,
    phq9.severity
  ].some(severity => severity === 'severe');
  
  if (hasSevereSymptoms) {
    recommendations.unshift({
      category: 'Emergency',
      title: 'Professional Support',
      description: 'Your assessment indicates severe symptoms. Please consider seeking immediate professional mental health support.',
      priority: 'high'
    });
  }
  
  return recommendations;
}

// Helper function to generate email content
function generateReportEmailContent(report) {
  const date = new Date(report.createdAt).toLocaleDateString();
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #4073c0;">MindSpace</h1>
        <h2 style="color: #333;">Mental Health Report</h2>
        <p style="color: #666;">Generated on ${date}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Assessment Results</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Depression (DASS-21):</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${report.dass21.depression.score} (${report.dass21.depression.severity})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Anxiety (DASS-21):</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${report.dass21.anxiety.score} (${report.dass21.anxiety.severity})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Stress (DASS-21):</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${report.dass21.stress.score} (${report.dass21.stress.severity})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>GAD-7:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${report.gad7.score} (${report.gad7.severity})</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>PHQ-9:</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${report.phq9.score} (${report.phq9.severity})</td>
          </tr>
        </table>
      </div>
      
      <div style="background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="color: #333; margin-top: 0;">Recommendations</h3>
        ${report.recommendations.map(rec => `
          <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
            <strong style="color: #4073c0;">${rec.title}</strong>
            <p style="margin: 5px 0 0 0; color: #666;">${rec.description}</p>
          </div>
        `).join('')}
      </div>
      
      <div style="text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>This report is generated by MindSpace and is for informational purposes only.</p>
        <p>Please consult with a healthcare professional for proper diagnosis and treatment.</p>
        <p>© ${new Date().getFullYear()} MindSpace. All rights reserved.</p>
      </div>
    </div>
  `;
}

module.exports = {
  analyzeMentalHealth,
  getMentalHealthReports,
  getMentalHealthReport,
  emailMentalHealthReport,
  saveModuleProgress,
  getModuleProgress,
  clearModuleProgress
};
