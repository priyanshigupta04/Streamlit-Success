const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  company:        { type: String, required: true },
  postedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:           { type: String, enum: ['internship','fulltime','parttime'], default: 'internship' },
  domain:         String,
  description:    { type: String, required: true },
  requiredSkills: [String],
  eligibility:    String,
  stipend:        String,
  location:       String,
  duration:       String,
  deadline:       Date,
  status:         { type: String, enum: ['open','closed'], default: 'open' },
  // Approval workflow
  approvalStatus: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  approvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,
  jdText:         String,
}, { timestamps: true });

jobSchema.index({ status: 1, deadline: 1 });
jobSchema.index({ postedBy: 1 });

module.exports = mongoose.model("Job", jobSchema);
