const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
  saveMood,
  getMoodHistory,
  getRecentMood,
  analyzeMood
} = require('../controllers/moodController');

const router = express.Router();

// Configure multer for memory storage (for image upload)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// Protect all mood routes with authentication
router.use(protect);

// Mood tracking routes
router.post('/', saveMood);
router.get('/', getMoodHistory);
router.get('/recent', getRecentMood);
router.post('/analyze', upload.single('image'), analyzeMood);

module.exports = router;
