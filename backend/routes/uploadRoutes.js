const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const { uploadImage, uploadResume } = require('../middleware/upload');
const { uploadProfileImage, uploadResume: handleResume } = require('../controllers/uploadController');

// POST /api/upload/image  — upload profile picture
router.post('/image',  protect, uploadImage.single('image'),   uploadProfileImage);

// POST /api/upload/resume — upload PDF resume + trigger AI parse
// we wrap multer call to capture errors (file size too large etc.) and send
// a friendly message instead of letting the request crash.
router.post('/resume', protect, (req, res, next) => {
  uploadResume.single('resume')(req, res, err => {
    if (err) {
      console.error('Multer error on resume upload:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Resume exceeds 10 MB limit' });
      }
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, handleResume);

module.exports = router;
