const mongoose = require("mongoose");

const weeklyLogSchema = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  guideId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  weekNumber:   { type: Number, required: true },
  title:        String,
  logText:      { type: String, required: true },
  fileUrl:      String,
  hoursWorked:  Number,
  status: { type: String,
    enum: ['submitted','under_review','approved','needs_revision'],
    default: 'submitted'
  },
  guideComment: String,
  reviewedAt:   Date,
}, { timestamps: true });

weeklyLogSchema.index({ studentId: 1, weekNumber: 1 });
weeklyLogSchema.index({ guideId: 1, status: 1 });

module.exports = mongoose.model("WeeklyLog", weeklyLogSchema);
