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

// Helper function to generate comprehensive email content
function generateReportEmailContent(report) {
  const date = new Date(report.createdAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const isEmergency = report.overallRisk === 'severe' || report.overallRisk === 'high';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MindSpace Mental Health Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8fafc;
        }
        
        .email-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #4073c0, #5a84d4);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .header .logo {
          font-size: 32px;
        }
        
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .content {
          padding: 30px;
        }
        
        .report-meta {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #4073c0;
        }
        
        .report-meta h3 {
          color: #4073c0;
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
        }
        
        .meta-label {
          font-weight: 600;
          color: #4073c0;
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .meta-value {
          color: #333;
          font-size: 16px;
        }
        
        .emergency-alert {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .emergency-alert h3 {
          font-size: 20px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .emergency-contacts {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        
        .emergency-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .section {
          margin-bottom: 35px;
        }
        
        .section-title {
          color: #4073c0;
          font-size: 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 10px;
        }
        
        .scores-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 25px;
        }
        
        .score-card {
          text-align: center;
          padding: 20px;
          margin-bottom: 15px;
          border-radius: 8px;
          color: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .score-card.normal {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .score-card.mild, .score-card.minimal {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        
        .score-card.moderate {
          background: linear-gradient(135deg, #f97316, #ea580c);
        }
        
        .score-card.severe {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .score-value {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        
        .score-label {
          font-size: 14px;
          margin-bottom: 5px;
          opacity: 0.9;
        }
        
        .score-severity {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .vitals-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        
        .vital-item {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          border-left: 3px solid #4073c0;
          margin-bottom: 15px;
        }
        
        .vital-label {
          font-weight: 600;
          color: #4073c0;
          font-size: 14px;
          margin-bottom: 5px;
        }
        
        .vital-value {
          font-size: 18px;
          font-weight: 700;
          color: #333;
          margin-bottom: 5px;
        }
        
        .vital-status {
          font-size: 12px;
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .vital-status.normal {
          background: #dcfce7;
          color: #166534;
        }
        
        .vital-status.elevated {
          background: #fef3c7;
          color: #92400e;
        }
        
        .vital-status.high {
          background: #fecaca;
          color: #991b1b;
        }
        
        .recommendations {
          margin-bottom: 25px;
        }
        
        .recommendation-item {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 15px;
          border-left: 4px solid #4073c0;
        }
        
        .recommendation-item.high {
          border-left-color: #ef4444;
          background: #fef2f2;
        }
        
        .recommendation-item.medium {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }
        
        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .recommendation-title {
          color: #4073c0;
          font-weight: 600;
          font-size: 16px;
        }
        
        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .priority-badge.high {
          background: #ef4444;
          color: white;
        }
        
        .priority-badge.medium {
          background: #f59e0b;
          color: white;
        }
        
        .priority-badge.low {
          background: #10b981;
          color: white;
        }
        
        .recommendation-category {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: 500;
        }
        
        .lifestyle-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .lifestyle-item {
          background: #f8fafc;
          padding: 15px;
          margin-bottom: 15px;
          border-radius: 8px;
          border-left: 3px solid #4073c0;
        }
        
        .lifestyle-label {
          font-weight: 600;
          color: #4073c0;
          display: block;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .lifestyle-value {
          color: #333;
          font-size: 14px;
        }
        
        .footer {
          background: #f8fafc;
          padding: 30px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        
        .footer-content {
          max-width: 600px;
          margin: 0 auto;
        }
        
        .disclaimer {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
        }
        
        .contact-info {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 15px;
        }
        
        .social-links {
          margin-top: 15px;
        }
        
        .social-links a {
          color: #4073c0;
          text-decoration: none;
          margin: 0 10px;
        }
        
        @media (max-width: 600px) {
          .meta-grid {
            grid-template-columns: 1fr;
          }
          
          .scores-grid {
            grid-template-columns: 1fr;
          }
          
          .vitals-grid {
            grid-template-columns: 1fr;
          }
          
          .lifestyle-grid {
            grid-template-columns: 1fr;
          }
          
          .emergency-contacts {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>
            <span class="logo">🧠</span>
            MindSpace Mental Health Report
          </h1>
          <p>Comprehensive Mental Wellness Assessment</p>
        </div>
        
        <div class="content">
          <div class="report-meta">
            <h3>📋 Report Information</h3>
            <div class="meta-grid">
              <div class="meta-item">
                <span class="meta-label">Patient Name</span>
                <span class="meta-value">${report.user.firstName} ${report.user.lastName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Generated On</span>
                <span class="meta-value">${date}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Report ID</span>
                <span class="meta-value">${report._id}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Overall Risk Level</span>
                <span class="meta-value" style="color: ${getRiskColor(report.overallRisk)}; font-weight: 600; text-transform: uppercase;">${report.overallRisk}</span>
              </div>
            </div>
          </div>
          
          ${isEmergency ? `
          <div class="emergency-alert">
            <h3>⚠️ Immediate Professional Support Recommended</h3>
            <p>Your assessment indicates significant mental health concerns that require immediate attention. Please consider reaching out to a mental health professional or crisis support service.</p>
            <div class="emergency-contacts">
              <a href="tel:9152987821" class="emergency-btn">📞 Crisis Helpline: 9152987821</a>
              <a href="tel:112" class="emergency-btn">🚨 Emergency: 112</a>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <h2 class="section-title">
              🧠 Mental Health Assessment Results
            </h2>
            <div class="scores-grid">
              <div class="score-card ${report.dass21.depression.severity}">
                <div class="score-value">${report.dass21.depression.score}</div>
                <div class="score-label">Depression (DASS-21)</div>
                <div class="score-severity">${report.dass21.depression.severity}</div>
              </div>
              <div class="score-card ${report.dass21.anxiety.severity}">
                <div class="score-value">${report.dass21.anxiety.score}</div>
                <div class="score-label">Anxiety (DASS-21)</div>
                <div class="score-severity">${report.dass21.anxiety.severity}</div>
              </div>
              <div class="score-card ${report.dass21.stress.severity}">
                <div class="score-value">${report.dass21.stress.score}</div>
                <div class="score-label">Stress (DASS-21)</div>
                <div class="score-severity">${report.dass21.stress.severity}</div>
              </div>
              <div class="score-card ${report.gad7.severity}">
                <div class="score-value">${report.gad7.score}</div>
                <div class="score-label">GAD-7 Assessment</div>
                <div class="score-severity">${report.gad7.severity}</div>
              </div>
              <div class="score-card ${report.phq9.severity}">
                <div class="score-value">${report.phq9.score}</div>
                <div class="score-label">PHQ-9 Assessment</div>
                <div class="score-severity">${report.phq9.severity}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">
              ❤️ Health Vitals Analysis
            </h2>
            <div class="vitals-grid">
              <div class="vital-item">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-value">${report.vitals.systolic}/${report.vitals.diastolic} mmHg</div>
                <span class="vital-status ${getVitalStatusClass('bp', report.vitals.systolic, report.vitals.diastolic)}">
                  ${getVitalStatusText('bp', report.vitals.systolic, report.vitals.diastolic)}
                </span>
              </div>
              <div class="vital-item">
                <div class="vital-label">Heart Rate</div>
                <div class="vital-value">${report.vitals.heartRate} BPM</div>
                <span class="vital-status ${getVitalStatusClass('hr', report.vitals.heartRate)}">
                  ${getVitalStatusText('hr', report.vitals.heartRate)}
                </span>
              </div>
              <div class="vital-item">
                <div class="vital-label">Sleep Duration</div>
                <div class="vital-value">${report.vitals.sleepDuration} hours</div>
                <span class="vital-status ${getVitalStatusClass('sleep', report.vitals.sleepDuration)}">
                  ${getVitalStatusText('sleep', report.vitals.sleepDuration)}
                </span>
              </div>
              ${report.vitals.temperature ? `
              <div class="vital-item">
                <div class="vital-label">Body Temperature</div>
                <div class="vital-value">${report.vitals.temperature}°F</div>
                <span class="vital-status normal">Normal</span>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${report.lifestyle ? `
          <div class="section">
            <h2 class="section-title">
              🏃 Lifestyle Summary
            </h2>
            <div class="lifestyle-grid">
              <div class="lifestyle-item">
                <span class="lifestyle-label">Exercise Frequency</span>
                <span class="lifestyle-value">${formatLifestyleValue(report.lifestyle.exerciseFrequency)}</span>
              </div>
              <div class="lifestyle-item">
                <span class="lifestyle-label">Smoking Status</span>
                <span class="lifestyle-value">${formatLifestyleValue(report.lifestyle.smokingStatus)}</span>
              </div>
              <div class="lifestyle-item">
                <span class="lifestyle-label">Alcohol Consumption</span>
                <span class="lifestyle-value">${formatLifestyleValue(report.lifestyle.alcoholConsumption)}</span>
              </div>
              ${report.lifestyle.screenTime ? `
              <div class="lifestyle-item">
                <span class="lifestyle-label">Daily Screen Time</span>
                <span class="lifestyle-value">${report.lifestyle.screenTime} hours</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <h2 class="section-title">
              💡 Personalized Recommendations
            </h2>
            <div class="recommendations">
              ${report.recommendations && report.recommendations.length > 0 ? 
                report.recommendations.map(rec => `
                  <div class="recommendation-item ${rec.priority}">
                    <div class="recommendation-header">
                      <span class="recommendation-title">${rec.title}</span>
                      <span class="priority-badge ${rec.priority}">${rec.priority} priority</span>
                    </div>
                    <div class="recommendation-category">${rec.category}</div>
                    <p>${rec.description}</p>
                  </div>
                `).join('') : 
                '<p style="text-align: center; color: #64748b; font-style: italic;">No specific recommendations at this time. Continue monitoring your mental health regularly.</p>'
              }
            </div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-content">
            <div class="disclaimer">
              <strong>⚠️ Important Disclaimer:</strong> This report is generated by MindSpace AI system and is for informational purposes only. It should not be considered as a substitute for professional medical advice, diagnosis, or treatment. Please consult with a qualified healthcare professional for proper evaluation and treatment.
            </div>
            
            <div class="contact-info">
              <p><strong>Need Support?</strong></p>
              <p>📧 Email: support@mindspace.edu</p>
              <p>📞 Helpline: 9152987821 (24/7)</p>
              <p>🚨 Emergency: 112</p>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
              © ${new Date().getFullYear()} MindSpace. All rights reserved.<br>
              This email was sent to ${report.user.email} as part of your mental health assessment.
            </p>
            
            <div class="social-links">
              <a href="#">Privacy Policy</a> | 
              <a href="#">Terms of Service</a> | 
              <a href="#">Unsubscribe</a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper functions for email styling
function getRiskColor(risk) {
  const colors = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#f97316',
    severe: '#ef4444'
  };
  return colors[risk] || '#64748b';
}

function getVitalStatusClass(type, value1, value2) {
  switch (type) {
    case 'bp':
      if (value1 < 120 && value2 < 80) return 'normal';
      if (value1 < 140 && value2 < 90) return 'elevated';
      return 'high';
    case 'hr':
      if (value1 >= 60 && value1 <= 100) return 'normal';
      return 'elevated';
    case 'sleep':
      if (value1 >= 7 && value1 <= 9) return 'normal';
      return 'elevated';
    default:
      return 'normal';
  }
}

function getVitalStatusText(type, value1, value2) {
  switch (type) {
    case 'bp':
      if (value1 < 120 && value2 < 80) return 'Normal';
      if (value1 < 140 && value2 < 90) return 'Elevated';
      return 'High';
    case 'hr':
      if (value1 >= 60 && value1 <= 100) return 'Normal';
      return 'Abnormal';
    case 'sleep':
      if (value1 >= 7 && value1 <= 9) return 'Optimal';
      return 'Poor';
    default:
      return 'Normal';
  }
}

function formatLifestyleValue(value) {
  if (!value) return 'Not specified';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/([A-Z])/g, ' $1');
}

// @desc    Download mental health report as PDF
// @route   GET /api/mental-health/reports/:id/pdf
// @access  Private
const downloadReportPDF = async (req, res) => {
  try {
    // This endpoint is deprecated - PDF generation is now handled client-side
    // Redirect to get the report data instead
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

    // Return the report data for client-side PDF generation
    res.status(200).json({
      success: true,
      data: report,
      message: 'Report data retrieved for PDF generation'
    });
    
  } catch (error) {
    console.error('Error retrieving report for PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve report data'
    });
  }
};

module.exports = {
  analyzeMentalHealth,
  getMentalHealthReports,
  getMentalHealthReport,
  emailMentalHealthReport,
  downloadReportPDF,
  saveModuleProgress,
  getModuleProgress,
  clearModuleProgress
};
