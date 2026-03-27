const InternshipForm = require('../models/InternshipForm');
const ReviewAttendance = require('../models/ReviewAttendance');

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
