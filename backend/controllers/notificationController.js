const Notification = require("../models/Notification");
const User = require("../models/User");

// GET /api/notifications/mine
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Not found' });
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/broadcast — placement_cell only
exports.broadcast = async (req, res) => {
  try {
    const { title, message, targetRole } = req.body;
    const filter = targetRole ? { role: targetRole } : {};
    const users = await User.find(filter).select('_id');

    const notifications = users.map(u => ({
      userId: u._id, type: 'announcement', title, message, link: '',
    }));

    await Notification.insertMany(notifications);
    res.json({ message: `Broadcast sent to ${users.length} users` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
