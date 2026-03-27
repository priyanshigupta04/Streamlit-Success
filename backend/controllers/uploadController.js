const axios  = require('axios');
const crypto = require('crypto');
const User   = require('../models/User');
const Notification = require('../models/Notification');

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
    if (!req.file) {
      // multer didn't pick up the file (wrong field name, bad headers, etc.)
      return res.status(400).json({ message: 'No file received. Make sure you are uploading a PDF under 10 MB with field name `resume`.' });
    }

    // cloudinary multer storage can populate `path`, `secure_url` or `url`
    const resumeUrl  = req.file.path || req.file.secure_url || req.file.url;
    const resumeName = req.file.originalname || '';

    if (!resumeUrl) {
      console.error('uploadResume: Cloudinary returned no URL', req.file);
      return res.status(500).json({ message: 'Upload succeeded but no URL was returned from Cloudinary' });
    }

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
    // log full error for investigation
    console.error('uploadResume error:', err);
    // send back helpful information in development
    const response = { message: 'Resume upload failed' };
    if (err.message) response.error = err.message;
    if (err.stack) response.stack = err.stack;
    // if it's an axios error, include response data
    if (err.response) {
      response.remote = err.response.data || err.response.statusText;
    }
    res.status(500).json(response);
  }
};

// ─────────────────────────────────────────────
//  POST /api/upload/offer-letter
//  Uploads offer letter PDF to Cloudinary,
//  saves URL/name on user, then notifies
//  mentor and placement cell users.
// ─────────────────────────────────────────────
const uploadOfferLetter = async (req, res) => {
  try {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║ 📝 OFFER LETTER UPLOAD STARTED');
    console.log('║ User:', req.user.name, '(' + req.user._id + ')');
    console.log('╚════════════════════════════════════════════╝');
    
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ message: 'No file received. Make sure you are uploading a PDF under 10 MB with field name offerLetter.' });
    }

    console.log('✅ File received:', req.file.originalname);
    const offerLetterUrl = req.file.path || req.file.secure_url || req.file.url;
    const offerLetterName = req.file.originalname || '';

    if (!offerLetterUrl) {
      console.error('❌ Cloudinary returned no URL');
      return res.status(500).json({ message: 'Upload succeeded but no URL was returned from Cloudinary' });
    }

    console.log('✅ Cloudinary URL received');

    // Generate file hash
    const fileIdentifier = `${offerLetterName}-${req.file.size}-${Date.now()}`;
    const offerLetterHash = crypto.createHash('sha256').update(fileIdentifier).digest('hex');

    // Save to database
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { offerLetterUrl, offerLetterName, offerLetterHash },
      { new: true }
    ).select('-password');

    console.log('✅ User saved to DB with offer letter');

    // Get FRESH mentor data
    const freshUser = await User.findById(req.user._id).populate('mentorId', 'name email _id');
    console.log('✅ Fresh user loaded. MentorId:', freshUser.mentorId?._id);

    const studentName = user.name || 'A student';
    const dept = user.department || 'Unknown Department';
    const mentorId = freshUser.mentorId?._id;

    // ========== SEND MENTOR NOTIFICATION ==========
    if (mentorId) {
      console.log('📧 Sending notification to mentor:', mentorId);
      try {
        const mentorNotif = await Notification.send(
          mentorId,
          'offer_received',
          'Offer Letter Uploaded',
          `${studentName} uploaded an offer letter (Hash: ${offerLetterHash.substring(0, 8).toUpperCase()}).`,
          '/mentor-dashboard'
        );
        console.log('✅ Mentor notification sent. ID:', mentorNotif._id);
      } catch (e) {
        console.error('❌ Mentor notification failed:', e.message);
      }
    } else {
      console.log('⚠️ No mentor assigned to student');
    }

    // ========== SEND PLACEMENT CELL NOTIFICATIONS ==========
    try {
      const placementUsers = await User.find({ role: 'placement_cell' }).select('_id name email').lean();
      console.log('📧 Found placement cell users:', placementUsers.length);
      
      if (placementUsers.length > 0) {
        const notifs = placementUsers.map(u => ({
          userId: u._id,
          type: 'offer_received',
          title: 'Offer Letter Uploaded',
          message: `${studentName} (${dept}) uploaded an offer letter.`,
          link: '/placement-cell-dashboard'
        }));
        
        const result = await Notification.insertMany(notifs);
        console.log('✅ Placement cell notifications sent:', result.length);
      }
    } catch (e) {
      console.error('❌ Placement notifications failed:', e.message);
    }

    console.log('╔════════════════════════════════════════════╗');
    console.log('║ ✨ OFFER LETTER UPLOAD COMPLETED');
    console.log('╚════════════════════════════════════════════╝');

    res.json({
      message: 'Offer letter uploaded successfully',
      offerLetterUrl,
      offerLetterName,
      offerLetterHash: offerLetterHash.substring(0, 8).toUpperCase(),
      user,
    });
  } catch (err) {
    console.error('❌ UPLOAD FAILED:', err.message);
    res.status(500).json({ message: 'Offer letter upload failed', error: err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/upload/offer-letter/view/:studentId
//  Streams the exact stored offer letter PDF
//  with proper headers so browser renders it.
// ─────────────────────────────────────────────
const viewOfferLetter = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId).select(
      'offerLetterUrl offerLetterName mentorId department'
    );

    if (!student || !student.offerLetterUrl) {
      return res.status(404).json({ message: 'Offer letter not found for this student' });
    }

    const isOwner = req.user._id.toString() === studentId;
    const isPlacement = req.user.role === 'placement_cell' || req.user.role === 'admin';
    const isAssignedMentor =
      req.user.role === 'mentor' &&
      student.mentorId &&
      student.mentorId.toString() === req.user._id.toString();
    const isSameDepartmentMentor =
      req.user.role === 'mentor' &&
      student.department &&
      req.user.department &&
      student.department.toLowerCase() === req.user.department.toLowerCase();

    if (!(isOwner || isPlacement || isAssignedMentor || isSameDepartmentMentor)) {
      return res.status(403).json({ message: 'Not authorized to view this offer letter' });
    }

    const upstream = await axios.get(student.offerLetterUrl, {
      responseType: 'stream',
      timeout: 30000,
    });

    const safeName = (student.offerLetterName || 'offer-letter.pdf').replace(/[^a-zA-Z0-9._\- ()]/g, '_');
    const filename = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    upstream.data.pipe(res);
  } catch (err) {
    console.error('viewOfferLetter error:', err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ message: 'Stored offer letter file was not found' });
    }
    return res.status(500).json({ message: 'Failed to open offer letter', error: err.message });
  }
};

module.exports = { uploadProfileImage, uploadResume, uploadOfferLetter, viewOfferLetter };
