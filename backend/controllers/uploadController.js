const axios  = require('axios');
const User   = require('../models/User');

// ─────────────────────────────────────────────
//  POST /api/upload/image
//  Uploads profile picture to Cloudinary and
//  saves the secure URL on the user document.
// ─────────────────────────────────────────────
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' });

    const imageUrl = req.file.path; // Cloudinary secure_url

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { image: imageUrl },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile image updated', imageUrl, user });
  } catch (err) {
    console.error('uploadProfileImage error:', err.message);
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
};

// ─────────────────────────────────────────────
//  POST /api/upload/resume
//  Uploads PDF to Cloudinary → calls Python AI
//  service to parse all fields → saves to DB.
// ─────────────────────────────────────────────
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file received' });

    const resumeUrl  = req.file.path;           // Cloudinary secure_url
    const resumeName = req.file.originalname;   // original filename

    // ── Step 1: Download the PDF text from Cloudinary and send to Python ──
    let parsedFields = {};
    let aiAnalysis   = {};

    try {
      // Ask Python service to download + parse the PDF
      const pyResponse = await axios.post(
        'http://localhost:8000/parse-resume-url',
        { resume_url: resumeUrl },
        { timeout: 30000 }
      );

      parsedFields = pyResponse.data.fields   || {};
      aiAnalysis   = pyResponse.data.analysis || {};
    } catch (pyErr) {
      console.warn('Python parse failed (non-fatal):', pyErr.message);
      // Still save the resume URL even if AI parse fails
    }

    // ── Step 2: Build DB update payload with all auto-filled fields ──
    const updateData = {
      resumeUrl,
      resumeName,
    };

    // Only overwrite if Python returned a value
    if (parsedFields.resumeText)    updateData.resumeText    = parsedFields.resumeText;
    if (parsedFields.skills?.length) {
      // Store as comma-separated string (matches frontend normalizeUser)
      updateData.skills = Array.isArray(parsedFields.skills)
        ? parsedFields.skills.join(', ')
        : parsedFields.skills;
    }
    if (parsedFields.name)          updateData.name          = parsedFields.name;
    if (parsedFields.contact)       updateData.contact       = parsedFields.contact;
    if (parsedFields.github)        updateData.github        = parsedFields.github;
    if (parsedFields.linkedin)      updateData.linkedin      = parsedFields.linkedin;
    if (parsedFields.cgpa)          updateData.cgpa          = parsedFields.cgpa;
    if (parsedFields.branch)        updateData.branch        = parsedFields.branch;
    if (parsedFields.projects?.length)       updateData.projects       = parsedFields.projects;
    if (parsedFields.certifications?.length) updateData.certifications = parsedFields.certifications;

    // ── Step 3: Save to DB ──
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      message:     'Resume uploaded & parsed successfully',
      resumeUrl,
      resumeName,
      parsedFields,
      aiAnalysis,
      user,
    });
  } catch (err) {
    console.error('uploadResume error:', err.message);
    res.status(500).json({ message: 'Resume upload failed', error: err.message });
  }
};

module.exports = { uploadProfileImage, uploadResume };
