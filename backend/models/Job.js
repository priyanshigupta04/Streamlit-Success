const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  company:        { type: String, required: true },
  interview: {
  scheduled: { type: Boolean, default: false },
  date: Date,
  time: String,
  mode: String,
  meetingLink: String,
  location: String},

  postedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:           { type: String, enum: ['internship','fulltime','parttime'], default: 'internship' },
  domain:         String,
  description:    { type: String, required: true },
  requiredSkills: [String],
  eligibility:    String,
  stipend:        String,
  location:       String,
  companyAddress: String,
  companyCity:    String,
  companyState:   String,
  companyWebsite: String,
  companyTechDomain: String,
  duration:       String,
  deadline:       Date,
  status:         { type: String, enum: ['open','closed'], default: 'open' },

  // Approval workflow
  approvalStatus: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,

  jdText:         String,
  

  // ✅ NEW: students shortlisted by recruiter
  shortlistedStudents: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  default: []
},
selectedStudents: {
  type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  default: []
}

}, { timestamps: true });

jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ postedBy: 1 });


module.exports = mongoose.model("Job", jobSchema);