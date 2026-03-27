const express = require('express');
const router  = express.Router();
const protect = require('../middleware/authMiddleware');
const { uploadImage, uploadResume, uploadOfferLetter } = require('../middleware/upload');
const {
  uploadProfileImage,
  uploadResume: handleResume,
  uploadOfferLetter: handleOfferLetter,
  viewOfferLetter,
} = require('../controllers/uploadController');

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

// POST /api/upload/offer-letter — upload offer letter PDF
router.post('/offer-letter', protect, (req, res, next) => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 OFFER-LETTER UPLOAD REQUEST RECEIVED');
  console.log('  User:', req.user.name, 'ID:', req.user._id);
  console.log('═══════════════════════════════════════════════════');
  
  uploadOfferLetter.single('offerLetter')(req, res, err => {
    if (err) {
      console.error('❌ MULTER ERROR ON OFFER LETTER UPLOAD');
      console.error('  Error Code:', err.code);
      console.error('  Error Message:', err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Offer letter exceeds 10 MB limit' });
      }
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      console.error('❌ NO FILE AFTER MULTER PROCESSING');
      return res.status(400).json({ message: 'File upload failed' });
    }
    
    console.log('✅ MULTER COMPLETED SUCCESSFULLY');
    console.log('  File Name:', req.file.originalname);
    console.log('  File Size:', req.file.size);
    console.log('-----Proceeding to controller-----');
    next();
  });
}, handleOfferLetter);

// GET /api/upload/offer-letter/view/:studentId — stream offer letter with correct PDF headers
router.get('/offer-letter/view/:studentId', protect, viewOfferLetter);

module.exports = router;
