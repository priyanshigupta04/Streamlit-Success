const User = require("../models/User");

// Whitelist of fields that can be updated via profile
const ALLOWED_PROFILE_FIELDS = [
  'name', 'contact', 'altEmail', 'github', 'linkedin',
  'cgpa', 'admissionYear', 'graduationYear', 'enrollmentNo',
  'department', 'branch', 'specialization', 'skills',
  'resumeName', 'image', 'certificates', 'phone', 'bio',
  'education', 'projects', 'certifications', 'linkedinUrl',
  'githubUrl', 'portfolioUrl', 'year', 'semester', 'companyName', 'companyIndustry',
  'companyTechDomain', 'companyEstablished', 'companySize', 'companyWebsite',
  'companyState', 'companyCity', 'companyLocation', 'companyAddress', 'companyDescription',
  'resumeUrl', 'resumeText', 'offerLetterUrl', 'offerLetterName', 'offerLetterHash', 'internshipReason',
  'universityName', 'designation', 'officeLocation', 'officeContact', 'supportEmail',
  'expertiseTags', 'officeHours', 'preferredReviewDay', 'preferredReviewTime', 'semesterStartDate'
];

const getMaxSemestersByBranch = (branch = '') => {
  const normalized = String(branch || '').trim().toLowerCase();
  if (!normalized) return 8;

  if (normalized.includes('b.tech') || normalized.includes('btech') || normalized.includes('be')) return 8;
  if (normalized.includes('bca')) return 6;
  if (normalized.includes('b.sc') || normalized.includes('bsc')) return 6;
  if (normalized.includes('b.com') || normalized.includes('bcom')) return 6;
  if (normalized.includes('bba')) return 6;
  if (normalized.includes('mca')) return 4;
  if (normalized.includes('m.tech') || normalized.includes('mtech')) return 4;
  if (normalized.includes('mba')) return 4;

  return 8;
};

const calculateSemesterFromStartDate = (semesterStartDate, branch, now = new Date()) => {
  if (!semesterStartDate) return null;

  const start = new Date(semesterStartDate);
  if (Number.isNaN(start.getTime())) return null;

  // Academic session based progression: Jan-Jun and Jul-Dec terms.
  const termIndex = (date) => (date.getFullYear() * 2) + (date.getMonth() >= 6 ? 1 : 0);
  const rawSemester = Math.max(1, (termIndex(now) - termIndex(start)) + 1);
  const maxSemester = getMaxSemestersByBranch(branch);
  return Math.min(rawSemester, maxSemester);
};

const trimIfString = (value) => (typeof value === 'string' ? value.trim() : value);

const syncSocialAndContactFields = (target) => {
  if (!target || typeof target !== 'object') return target;

  target.github = trimIfString(target.github);
  target.githubUrl = trimIfString(target.githubUrl);
  target.linkedin = trimIfString(target.linkedin);
  target.linkedinUrl = trimIfString(target.linkedinUrl);
  target.portfolioUrl = trimIfString(target.portfolioUrl);
  target.phone = trimIfString(target.phone);
  target.contact = trimIfString(target.contact);

  if (!target.github && target.githubUrl) target.github = target.githubUrl;
  if (!target.githubUrl && target.github) target.githubUrl = target.github;

  if (!target.linkedin && target.linkedinUrl) target.linkedin = target.linkedinUrl;
  if (!target.linkedinUrl && target.linkedin) target.linkedinUrl = target.linkedin;

  if (!target.contact && target.phone) target.contact = target.phone;
  if (!target.phone && target.contact) target.phone = target.contact;

  return target;
};

const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidPhoneLike = (value) => {
  if (!value) return true;
  return /^[+]?[0-9\s()-]{7,20}$/.test(String(value));
};

const validateProfileUpdates = (updates, currentUser) => {
  const errors = [];

  const urlFields = ['github', 'githubUrl', 'linkedin', 'linkedinUrl', 'portfolioUrl', 'companyWebsite'];
  urlFields.forEach((field) => {
    if (updates[field] !== undefined && !isValidHttpUrl(updates[field])) {
      errors.push(`${field} must be a valid http/https URL`);
    }
  });

  if ((updates.phone !== undefined && !isValidPhoneLike(updates.phone)) ||
      (updates.contact !== undefined && !isValidPhoneLike(updates.contact))) {
    errors.push('phone/contact format is invalid');
  }

  if (updates.cgpa !== undefined && updates.cgpa !== '') {
    const cgpa = Number(updates.cgpa);
    if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
      errors.push('cgpa must be a number between 0 and 10');
    }
  }

  if (currentUser.role === 'student' && updates.semesterStartDate !== undefined && updates.semesterStartDate !== null) {
    const start = new Date(updates.semesterStartDate);
    if (Number.isNaN(start.getTime())) {
      errors.push('semesterStartDate is invalid');
    } else if (start > new Date()) {
      errors.push('semesterStartDate cannot be in the future');
    }
  }

  return errors;
};

// GET profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user?.role === 'student' && user.semesterStartDate) {
      const computedSemester = calculateSemesterFromStartDate(user.semesterStartDate, user.branch);
      if (computedSemester && user.semester !== computedSemester) {
        user.semester = computedSemester;
        await user.save();
      }
    }

    const responseUser = syncSocialAndContactFields(user.toObject ? user.toObject() : user);
    res.json(responseUser);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE profile — whitelisted fields only, no mass assignment
const updateProfile = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('role branch semesterStartDate');
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    ALLOWED_PROFILE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    syncSocialAndContactFields(updates);

    if (typeof updates.semesterStartDate === 'string' && !updates.semesterStartDate.trim()) {
      updates.semesterStartDate = null;
    }

    const validationErrors = validateProfileUpdates(updates, currentUser);
    if (validationErrors.length) {
      return res.status(400).json({
        message: 'Profile validation failed',
        errors: validationErrors,
      });
    }

    if (currentUser.role === 'student') {
      const effectiveBranch = updates.branch !== undefined ? updates.branch : currentUser.branch;
      const effectiveSemesterStartDate = updates.semesterStartDate !== undefined
        ? updates.semesterStartDate
        : currentUser.semesterStartDate;

      const computedSemester = calculateSemesterFromStartDate(effectiveSemesterStartDate, effectiveBranch);
      if (computedSemester) {
        updates.semester = computedSemester;
      }
    }

    // Guard against accidental resume URL wipes from empty-string payloads.
    if (typeof updates.resumeUrl === 'string' && !updates.resumeUrl.trim()) {
      delete updates.resumeUrl;
      if (typeof updates.resumeName === 'string' && updates.resumeName.trim()) {
        delete updates.resumeName;
      }
    }

    // Ignore temporary browser blob URLs; only persisted URLs should be stored.
    if (typeof updates.image === 'string' && updates.image.startsWith('blob:')) {
      delete updates.image;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    const responseUser = syncSocialAndContactFields(updatedUser.toObject ? updatedUser.toObject() : updatedUser);
    res.json(responseUser);
  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
