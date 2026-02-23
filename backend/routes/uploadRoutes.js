const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const { uploadImage, uploadResume } = require('../middleware/upload');
const { uploadProfileImage, uploadResume: handleResume } = require('../controllers/uploadController');

// POST /api/upload/image  — upload profile picture
router.post('/image',  protect, uploadImage.single('image'),   uploadProfileImage);

// POST /api/upload/resume — upload PDF resume + trigger AI parse
router.post('/resume', protect, uploadResume.single('resume'), handleResume);

module.exports = router;
