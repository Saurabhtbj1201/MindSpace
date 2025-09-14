const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userMessage: {
    type: String,
    required: true,
    maxlength: 1000
  },
  aiResponse: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['normal', 'emergency', 'fallback'],
    default: 'normal'
  },
  mood: {
    label: String,
    confidence: Number,
    detectedAt: Date
  },
  metadata: {
    timestamp: {
      type: Date,
      default: Date.now
    },
    responseLength: Number,
    processingTime: Number,
    aiModel: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
ConversationSchema.index({ user: 1, createdAt: -1 });
ConversationSchema.index({ user: 1, type: 1 });

// Auto-delete conversations older than 90 days
ConversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
