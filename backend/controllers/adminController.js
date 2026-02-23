const User = require("../models/User");
const Job = require("../models/Job");
const Application = require("../models/Application");
const DocumentRequest = require("../models/DocumentRequest");

// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const limit = 20;
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.json({ users, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/users/:id/role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const VALID = ['student', 'recruiter', 'mentor', 'internal_guide', 'placement_cell', 'hod', 'dean'];
    if (!VALID.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalRecruiters,
      totalJobs,
      openJobs,
      totalApplications,
      pendingDocuments,
      roleCounts,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'recruiter' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'open' }),
      Application.countDocuments(),
      DocumentRequest.countDocuments({ overallStatus: { $nin: ['issued', 'rejected'] } }),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    ]);

    const applicationsByStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({
      totalUsers, totalStudents, totalRecruiters,
      totalJobs, openJobs,
      totalApplications, pendingDocuments,
      roleCounts, applicationsByStatus,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/students/:studentId/assign-mentor
exports.assignMentorToStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { mentorId } = req.body;

    if (!mentorId) {
      return res.status(400).json({ message: 'mentorId is required' });
    }

    // Verify mentor exists and has mentor role
    const mentor = await User.findById(mentorId);
    if (!mentor || mentor.role !== 'mentor') {
      return res.status(400).json({ message: 'Invalid mentor or mentor does not exist' });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid student or student does not exist' });
    }

    // Assign mentor to student
    student.mentorId = mentorId;
    await student.save();

    res.json({ 
      message: 'Mentor assigned successfully',
      student: student.toObject() 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
