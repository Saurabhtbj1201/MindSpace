const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  generateChatResponse,
  getConversationHistory,
  clearConversationHistory
} = require('../controllers/aiController');

const router = express.Router();

// Protect all AI routes with authentication
router.use(protect);

// AI chat routes
router.post('/chat', generateChatResponse);
router.get('/conversation', getConversationHistory);
router.delete('/conversation', clearConversationHistory);

module.exports = router;
