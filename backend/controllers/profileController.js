const User = require("../models/User");

// Whitelist of fields that can be updated via profile
const ALLOWED_PROFILE_FIELDS = [
  'name', 'contact', 'altEmail', 'github', 'linkedin',
  'cgpa', 'admissionYear', 'graduationYear', 'enrollmentNo',
  'department', 'branch', 'specialization', 'skills',
  'resumeName', 'image', 'certificates', 'phone', 'bio',
  'education', 'projects', 'certifications', 'linkedinUrl',
  'githubUrl', 'portfolioUrl', 'year', 'semester', 'companyName', 'companyIndustry',
  'resumeUrl', 'resumeText', 'offerLetterUrl', 'offerLetterName', 'offerLetterHash', 'internshipReason'
];

// GET profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE profile — whitelisted fields only, no mass assignment
const updateProfile = async (req, res) => {
  try {
    const updates = {};
    ALLOWED_PROFILE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
