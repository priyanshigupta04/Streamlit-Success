const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  password:        { type: String, required: true },
  role:            { type: String, enum: [
    'student','recruiter','mentor','internal_guide',
    'placement_cell','hod','dean'
  ], required: true },

  // Profile fields
  phone:           String,
  contact:         String,
  altEmail:        String,
  bio:             String,
  branch:          String,
  department:      String,
  year:            Number,
  semester:        Number,
  cgpa:            String,
  skills:          { type: mongoose.Schema.Types.Mixed, default: '' },
  resumeUrl:       String,
  resumeName:      String,
  offerLetterUrl:  String,
  offerLetterName: String,
  offerLetterHash: String,
  resumeText:      String,
  internshipReason: String,
  profileComplete: { type: Boolean, default: false },

  // Academic
  admissionYear:   String,
  graduationYear:  String,
  enrollmentNo:    String,
  specialization:  String,
  education:       String,
  projects:        [String],
  certifications:  [String],
  certificates:    { type: Array, default: [] },

  // Links
  github:          String,
  linkedin:        String,
  githubUrl:       String,
  linkedinUrl:     String,
  portfolioUrl:    String,
  image:           String,

  // Relations
  mentorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guideId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Company (recruiter-specific)
  companyName:     String,
  companyIndustry: String,

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
