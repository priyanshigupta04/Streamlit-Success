const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  studentId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Job'  },  // optional for quick-apply
  // Embedded job info for quick-apply (when no real Job document exists)
  jobTitle:       String,
  company:        String,
  location:       String,
  stipend:        String,
  status: { type: String,
    enum: ['applied','shortlisted','interview_scheduled','selected','rejected','offer_accepted','offer_declined'],
    default: 'applied'
  },
  matchScore:     Number,
  resumeUrl:      String,
  coverNote:      String,
  recruiterNote:  String,
  offerLetterUrl: String,
  offerDeadline:  Date,
  // Mentor approval tracking
  mentorApproval: {
    approved:     { type: Boolean, default: false },
    approvedAt:   Date,
    mentorNote:   String,
  },
}, { timestamps: true });

applicationSchema.index({ studentId: 1, jobId: 1 }, { unique: true, sparse: true });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ studentId: 1, company: 1, jobTitle: 1 }, { unique: true, sparse: true });
applicationSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);
