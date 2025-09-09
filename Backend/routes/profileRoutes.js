const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getProfile,
  updateProfile,
  deleteProfile,
  getProfileCompletion
} = require('../controllers/profileController');

const router = express.Router();

// Protect all profile routes with authentication
router.use(protect);

// Profile routes
router.route('/')
  .get(getProfile)
  .put(updateProfile)
  .delete(deleteProfile);

router.get('/completion', getProfileCompletion);

module.exports = router;