const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: [
    'application_status','document_status','interview_scheduled',
    'log_reviewed','offer_received','announcement'
  ]},
  title:    String,
  message:  { type: String, required: true },
  link:     String,
  read:     { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1 });

notificationSchema.statics.send = async function(userId, type, title, message, link) {
  return this.create({ userId, type, title, message, link });
};

module.exports = mongoose.model("Notification", notificationSchema);
