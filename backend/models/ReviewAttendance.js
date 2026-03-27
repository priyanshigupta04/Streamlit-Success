const mongoose = require('mongoose');

const reviewAttendanceSchema = new mongoose.Schema(
  {
    guideId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewDate: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewAttendanceSchema.index({ guideId: 1, reviewDate: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('ReviewAttendance', reviewAttendanceSchema);
