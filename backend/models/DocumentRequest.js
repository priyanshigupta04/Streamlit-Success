const mongoose = require("mongoose");

const approvalSubSchema = {
  status:  { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  by:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:    String,
  at:      Date,
};

const docRequestSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String,
    enum: ['noc','bonafide','completion_certificate','experience_letter','custom'],
    required: true
  },
  reason:       String,
  jobId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },

  mentorApproval: approvalSubSchema,
  hodApproval:    approvalSubSchema,
  deanApproval:   approvalSubSchema,

  overallStatus: { type: String,
    enum: ['pending','mentor_approved','hod_approved','issued','rejected'],
    default: 'pending'
  },
  
  // Document generation fields
  generatedDocUrl: String,
  generatedAt: Date,
  signatureUrl: String,
  signedAt: Date,
  issueDate: Date,
  expiryDate: Date,
  documentVersion: { type: Number, default: 0 },
  
  // Metadata auto-filled from student data
  metadata: {
    studentName: String,
    enrollmentNo: String,
    branch: String,
    year: Number,
    dateOfGeneration: Date,
  },
}, { timestamps: true });

docRequestSchema.index({ studentId: 1 });
docRequestSchema.index({ overallStatus: 1 });
docRequestSchema.index({ generatedDocUrl: 1 });

module.exports = mongoose.model("DocumentRequest", docRequestSchema);
