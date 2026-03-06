const mongoose = require('mongoose');

const DepartmentMentorSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      enum: ['SOCSET', 'SOTE', 'SOB', 'SAAD'],
      required: true,
      unique: true,
    },
    mentorName: {
      type: String,
      required: true,
    },
    mentorEmail: {
      type: String,
      required: true,
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DepartmentMentor', DepartmentMentorSchema);
