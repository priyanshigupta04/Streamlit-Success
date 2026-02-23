const WeeklyLog = require("../models/WeeklyLog");
const Notification = require("../models/Notification");

// POST /api/logs — student submits a log
exports.createLog = async (req, res) => {
  try {
    const { weekNumber, title, logText, fileUrl, hoursWorked } = req.body;
    const student = req.user;

    const log = await WeeklyLog.create({
      studentId: student._id,
      guideId: student.guideId || null,
      weekNumber, title, logText, fileUrl, hoursWorked,
      status: 'submitted',
    });

    if (student.guideId) {
      await Notification.send(
        student.guideId, 'log_reviewed',
        'New Weekly Log', `${student.name} submitted Week ${weekNumber} log`,
        '/guide-dashboard'
      );
    }

    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/logs/mine — student's own logs
exports.getMyLogs = async (req, res) => {
  try {
    const logs = await WeeklyLog.find({ studentId: req.user._id })
      .sort({ weekNumber: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/logs/students — guide gets all logs for their students
exports.getStudentLogs = async (req, res) => {
  try {
    const filter = { guideId: req.user._id };
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.status) filter.status = req.query.status;

    const logs = await WeeklyLog.find(filter)
      .populate('studentId', 'name email branch')
      .sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/logs/:id/review — guide reviews a log
exports.reviewLog = async (req, res) => {
  try {
    const { status, guideComment } = req.body;
    const log = await WeeklyLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    const validStatuses = ['approved', 'needs_revision', 'under_review'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    log.status = status;
    if (guideComment) log.guideComment = guideComment;
    log.reviewedAt = new Date();
    await log.save();

    const msgs = {
      approved: `Your Week ${log.weekNumber} log has been approved!`,
      needs_revision: `Your Week ${log.weekNumber} log needs revision: ${guideComment}`,
      under_review: `Your Week ${log.weekNumber} log is under review.`,
    };

    await Notification.send(
      log.studentId, 'log_reviewed',
      'Log Review', msgs[status],
      '/student-dashboard'
    );

    res.json({ log });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
