const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const allowedImageExt = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

const isPdfFile = (file) => {
  const ext = path.extname(file?.originalname || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  const extOk = ext === '.pdf';
  const mimeOk = ['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(mime);
  return extOk && mimeOk;
};

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file?.originalname || '').toLowerCase();
  const mime = String(file?.mimetype || '').toLowerCase();
  if (allowedImageExt.has(ext) && allowedImageMime.has(mime)) return cb(null, true);
  return cb(new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed'));
};

const pdfFileFilter = (req, file, cb) => {
  if (isPdfFile(file)) return cb(null, true);
  return cb(new Error('Only PDF files are allowed'));
};

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
  params: (req, file) => {
    const userId = req?.user?._id?.toString() || 'anonymous';
    const timestamp = Date.now();
    return {
      folder: 'skillsync/resumes',
      allowed_formats: ['pdf'],
      resource_type: 'raw',
      public_id: `${userId}-${timestamp}`,
    };
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

const uploadImage  = multer({ storage: imageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadResume = multer({ storage: resumeStorage, fileFilter: pdfFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadOfferLetter = multer({ storage: offerLetterStorage, fileFilter: pdfFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = { uploadImage, uploadResume, uploadOfferLetter };
