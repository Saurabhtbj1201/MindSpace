const mongoose = require('mongoose');

const MentalHealthReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Health Vitals
  vitals: {
    systolic: {
      type: Number,
      required: true,
      min: 70,
      max: 250
    },
    diastolic: {
      type: Number,
      required: true,
      min: 40,
      max: 150
    },
    heartRate: {
      type: Number,
      required: true,
      min: 40,
      max: 200
    },
    sleepDuration: {
      type: Number,
      required: true,
      min: 0,
      max: 24
    },
    temperature: {
      type: Number,
      min: 35,
      max: 110  // Changed to support Fahrenheit (95-110°F range)
    }
  },
  
  // Lifestyle Information
  lifestyle: {
    exerciseFrequency: {
      type: String,
      enum: ['never', 'rarely', 'sometimes', 'often', 'daily']
    },
    smokingStatus: {
      type: String,
      enum: ['never', 'former', 'current', 'occasional']
    },
    alcoholConsumption: {
      type: String,
      enum: ['never', 'rarely', 'occasionally', 'regularly', 'daily']
    },
    screenTime: Number,
    chronicConditions: String,
    medications: String
  },
  
  // Assessment Results
  dass21: {
    depression: {
      score: {
        type: Number,
        required: true,
        min: 0,
        max: 42
      },
      severity: {
        type: String,
        enum: ['normal', 'mild', 'moderate', 'severe'],
        required: true
      }
    },
    anxiety: {
      score: {
        type: Number,
        required: true,
        min: 0,
        max: 42
      },
      severity: {
        type: String,
        enum: ['normal', 'mild', 'moderate', 'severe'],
        required: true
      }
    },
    stress: {
      score: {
        type: Number,
        required: true,
        min: 0,
        max: 42
      },
      severity: {
        type: String,
        enum: ['normal', 'mild', 'moderate', 'severe'],
        required: true
      }
    }
  },
  
  gad7: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 21
    },
    severity: {
      type: String,
      enum: ['normal', 'mild', 'moderate', 'severe'],
      required: true
    }
  },
  
  phq9: {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 27
    },
    severity: {
      type: String,
      enum: ['normal', 'minimal', 'mild', 'moderate', 'severe'],
      required: true
    }
  },
  
  // Overall Analysis
  overallRisk: {
    type: String,
    enum: ['low', 'moderate', 'high', 'severe'],
    required: true
  },
  
  recommendations: [{
    category: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Report metadata
  reportVersion: {
    type: String,
    default: '1.0'
  }
});

// Index for efficient querying
MentalHealthReportSchema.index({ user: 1, createdAt: -1 });

const MentalHealthReport = mongoose.model('MentalHealthReport', MentalHealthReportSchema);

module.exports = MentalHealthReport;
