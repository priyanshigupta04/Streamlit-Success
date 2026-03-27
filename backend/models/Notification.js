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
  console.log('📧 [NOTIFICATION.SEND] Called with:', { userId, type, title, messageLength: message.length });
  try {
    const result = await this.create({ userId, type, title, message, link });
    console.log('📧 [NOTIFICATION.SEND] Created successfully:', { id: result._id, userId: result.userId });
    return result;
  } catch (err) {
    console.error('❌ [NOTIFICATION.SEND] Failed:', { error: err.message, stack: err.stack });
    throw err;
  }
};

module.exports = mongoose.model("Notification", notificationSchema);
