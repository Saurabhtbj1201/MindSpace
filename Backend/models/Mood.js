const mongoose = require('mongoose');

const MoodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0,
    max: 6
    // 0: Angry, 1: Disgust, 2: Fear, 3: Happy, 4: Neutral, 5: Sad, 6: Surprise
  },
  label: {
    type: String,
    required: true,
    enum: ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']
  },
  notes: {
    type: String,
    maxlength: 500
  },
  capturedVia: {
    type: String,
    enum: ['manual', 'ai'],
    default: 'manual'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for querying recent moods efficiently
MoodSchema.index({ user: 1, createdAt: -1 });

const Mood = mongoose.model('Mood', MoodSchema);

module.exports = Mood;
