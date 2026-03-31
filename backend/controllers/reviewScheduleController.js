const InternshipForm = require('../models/InternshipForm');
const ReviewAttendance = require('../models/ReviewAttendance');
const Notification = require('../models/Notification');
const SharedReport = require('../models/SharedReport');
const User = require('../models/User');

const buildSenderMeta = (req) => ({
  sender: {
    id: req?.user?._id || null,
    name: req?.user?.name || '',
    role: req?.user?.role || '',
  },
});

const normalizeReviewDate = (dateStr) => {
  const base = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
};

// GET /api/review-schedule?date=YYYY-MM-DD
exports.getReviewSchedule = async (req, res) => {
  try {
    const reviewDate = normalizeReviewDate(req.query.date);
    if (!reviewDate) return res.status(400).json({ message: 'Invalid date format' });

    const forms = await InternshipForm.find({
      internalGuide: req.user._id,
      status: 'approved',
    }).populate('student', 'name email department branch enrollmentNo');

    const uniqueStudents = Object.values(
      forms.reduce((acc, form) => {
        if (!form.student?._id) return acc;
        const sid = String(form.student._id);
        if (!acc[sid]) {
          acc[sid] = {
            _id: form.student._id,
            name: form.student.name,
            email: form.student.email,
            department: form.student.department,
            branch: form.student.branch,
            enrollmentNo: form.student.enrollmentNo,
            companyName: form.companyName,
            role: form.role,
          };
        }
        return acc;
      }, {})
    );

    const studentIds = uniqueStudents.map((s) => s._id);
    const attendanceDocs = await ReviewAttendance.find({
      guideId: req.user._id,
      reviewDate,
      studentId: { $in: studentIds },
    }).lean();

    const attendanceMap = attendanceDocs.reduce((acc, item) => {
      acc[String(item.studentId)] = item;
      return acc;
    }, {});

    const students = uniqueStudents.map((s) => ({
      ...s,
      attendanceStatus: attendanceMap[String(s._id)]?.status || null,
      attendanceNote: attendanceMap[String(s._id)]?.note || '',
    }));

    res.json({
      date: reviewDate.toISOString().slice(0, 10),
      students,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/review-schedule/attendance
exports.upsertAttendance = async (req, res) => {
  try {
    const { date, studentId, status, note } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({ message: 'studentId and status are required' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const reviewDate = normalizeReviewDate(date);
    if (!reviewDate) return res.status(400).json({ message: 'Invalid date format' });

    // Ensure this student belongs to this internal guide via approved internship form
    const assigned = await InternshipForm.findOne({
      internalGuide: req.user._id,
      student: studentId,
      status: 'approved',
    }).select('_id');

    if (!assigned) {
      return res.status(403).json({ message: 'Student is not assigned to this internal guide' });
    }

    const attendance = await ReviewAttendance.findOneAndUpdate(
      {
        guideId: req.user._id,
        studentId,
        reviewDate,
      },
      {
        guideId: req.user._id,
        studentId,
        reviewDate,
        status,
        note: note || '',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/review-schedule/history?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getAttendanceHistory = async (req, res) => {
  try {
    const fromDate = req.query.from ? normalizeReviewDate(req.query.from) : null;
    const toDate = req.query.to ? normalizeReviewDate(req.query.to) : null;

    if ((req.query.from && !fromDate) || (req.query.to && !toDate)) {
      return res.status(400).json({ message: 'Invalid date format for from/to' });
    }

    const filter = { guideId: req.user._id };
    if (fromDate || toDate) {
      filter.reviewDate = {};
      if (fromDate) filter.reviewDate.$gte = fromDate;
      if (toDate) filter.reviewDate.$lte = toDate;
    }

    const attendance = await ReviewAttendance.find(filter)
      .populate('studentId', 'name email department branch enrollmentNo')
      .sort({ reviewDate: -1, createdAt: -1 })
      .lean();

    res.json({
      records: attendance,
      count: attendance.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/review-schedule/history/:id
exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const attendance = await ReviewAttendance.findOneAndDelete({
      _id: req.params.id,
      guideId: req.user._id,
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    return res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/review-schedule/notify
exports.notifyReviewSchedule = async (req, res) => {
  try {
    const reviewDate = normalizeReviewDate(req.body?.date || req.query?.date);
    if (!reviewDate) return res.status(400).json({ message: 'Invalid date format' });

    const forms = await InternshipForm.find({
      internalGuide: req.user._id,
      status: 'approved',
    }).populate('student', 'name');

    const uniqueStudents = Object.values(
      forms.reduce((acc, form) => {
        if (!form.student?._id) return acc;
        const sid = String(form.student._id);
        if (!acc[sid]) {
          acc[sid] = {
            _id: form.student._id,
            name: form.student.name || 'Student',
          };
        }
        return acc;
      }, {})
    );

    if (!uniqueStudents.length) {
      return res.status(400).json({ message: 'No assigned students found for review schedule notification' });
    }

    const dateText = reviewDate.toISOString().slice(0, 10);
    const guideName = req.user?.name || 'Your internal guide';

    await Promise.all(
      uniqueStudents.map((student) =>
        Notification.send(
          student._id,
          'announcement',
          'Weekly Review Scheduled',
          `${guideName} has scheduled your weekly review on ${dateText}. Please be prepared and keep your updates ready.`,
          '/student-dashboard',
          buildSenderMeta(req)
        )
      )
    );

    return res.json({
      message: `Review schedule notification sent to ${uniqueStudents.length} student(s) for ${dateText}`,
      count: uniqueStudents.length,
      date: dateText,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/review-schedule/share-report
exports.shareAttendanceReport = async (req, res) => {
  try {
    const {
      mode = 'single',
      date = '',
      total = 0,
      present = 0,
      absent = 0,
    } = req.body || {};

    // Fetch actual attendance records based on filter
    let filter = { guideId: req.user._id };
    
    if (mode === 'single' && date) {
      const reviewDate = normalizeReviewDate(date);
      filter.reviewDate = reviewDate;
    }

    const attendanceRecords = await ReviewAttendance.find(filter)
      .populate('studentId', 'name email')
      .lean();

    // Format attendance details
    const attendanceDetails = attendanceRecords.map(record => ({
      studentId: record.studentId._id,
      studentName: record.studentId.name,
      studentEmail: record.studentId.email,
      status: record.status,
    }));

    // Create shared report record
    const sharedReport = await SharedReport.create({
      sharedBy: req.user._id,
      sharedByName: req.user?.name || 'Internal Guide',
      reportType: 'attendance',
      filterMode: mode,
      filterDate: date || null,
      summary: {
        total: attendanceRecords.length,
        present: attendanceRecords.filter(r => r.status === 'present').length,
        absent: attendanceRecords.filter(r => r.status === 'absent').length,
      },
      attendanceDetails,
      sharedWith: [],
    });

    // Find Dean and HOD users
    const recipients = await User.find({ role: { $in: ['dean', 'hod'] } }).select('_id role name');
    if (!recipients.length) {
      return res.status(404).json({ message: 'No Dean/HOD users found to receive the report' });
    }

    // Update sharedWith list
    sharedReport.sharedWith = recipients.map(r => r._id);
    await sharedReport.save();

    // Send notifications
    const guideName = req.user?.name || 'Internal Guide';
    const filterLabel = mode === 'all' ? 'All Attendance' : `Date: ${date || 'N/A'}`;
    const title = 'Attendance Report Shared';
    const message = `${guideName} shared an attendance report (${filterLabel}). Total: ${sharedReport.summary.total}, Present: ${sharedReport.summary.present}, Absent: ${sharedReport.summary.absent}.`;

    await Promise.all(
      recipients.map((u) =>
        Notification.send(
          u._id,
          'announcement',
          title,
          message,
          '/dean-dashboard',
          buildSenderMeta(req)
        )
      )
    );

    return res.json({
      message: `Attendance report shared with ${recipients.length} recipient(s)`,
      recipients: recipients.length,
      reportId: sharedReport._id,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/review-schedule/shared-reports
exports.getSharedReports = async (req, res) => {
  try {
    const reports = await SharedReport.find({
      sharedWith: req.user._id,
    })
      .populate('sharedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      reports,
      count: reports.length,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
