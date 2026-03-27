const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// --- Profile Image Storage ---
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillsync/profile-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
  },
});

// --- Resume PDF Storage ---
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillsync/resumes',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

// --- Offer Letter PDF Storage ---
const offerLetterStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'skillsync/offer-letters',
    allowed_formats: ['pdf'],
    resource_type: 'raw',
  },
});

const uploadImage  = multer({ storage: imageStorage,  limits: { fileSize: 5 * 1024 * 1024 } });
const uploadResume = multer({ storage: resumeStorage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadOfferLetter = multer({ storage: offerLetterStorage, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = { uploadImage, uploadResume, uploadOfferLetter };
