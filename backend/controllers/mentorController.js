const User = require('../models/User');
const DepartmentMentor = require('../models/DepartmentMentor');

const DEPARTMENTS = ['SOCSET', 'SOTE', 'SOB', 'SAAD'];
const Application = require("../models/Application");

// Get all mentor assignments
exports.getAllMentors = async (req, res) => {
  try {
    const mentors = await DepartmentMentor.find()
      .populate('mentorId', 'name email')
      .populate('assignedBy', 'name')
      .sort({ department: 1 });
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mentors', error: err.message });
  }
};

// Get mentor for specific department
exports.getMentorByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    const mentor = await DepartmentMentor.findOne({ department })
      .populate('mentorId', 'name email')
      .populate('assignedBy', 'name');
    
    if (!mentor) {
      return res.status(404).json({ message: 'No mentor assigned for this department' });
    }

    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch mentor', error: err.message });
  }
};

// Assign mentor to department
exports.assignMentor = async (req, res) => {
  try {
    const { department, mentorName, mentorEmail } = req.body;
    const placementCellUserId = req.user._id;

    // Validate department
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    // Check if mentor already assigned to this department
    let existingMentor = await DepartmentMentor.findOne({ department });
    if (existingMentor) {
      return res.status(409).json({ message: 'Mentor already assigned to this department. Use update instead.' });
    }

    // Try to find user with this email
    let mentorUser = await User.findOne({ email: mentorEmail });

    // Create department mentor assignment
    const newMentor = new DepartmentMentor({
      department,
      mentorName,
      mentorEmail,
      mentorId: mentorUser ? mentorUser._id : null,
      assignedBy: placementCellUserId,
    });

    await newMentor.save();

    // If mentor user exists, update their role to mentor if not already
    if (mentorUser && mentorUser.role !== 'mentor') {
      mentorUser.role = 'mentor';
      mentorUser.department = department;
      await mentorUser.save();
    }

    res.status(201).json({
      message: 'Mentor assigned successfully',
      mentor: await newMentor.populate(['mentorId', 'assignedBy']),
    });
  } catch (err) {
    console.error('Error assigning mentor:', err);
    res.status(500).json({ message: 'Failed to assign mentor', error: err.message, details: err.toString() });
  }
};

// Update mentor for department
exports.updateMentor = async (req, res) => {
  try {
    const { department } = req.params;
    const { mentorName, mentorEmail } = req.body;

    // Validate department
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    let mentor = await DepartmentMentor.findOne({ department });
    if (!mentor) {
      return res.status(404).json({ message: 'No mentor assignment found for this department' });
    }

    // Find new mentor user if email changed
    let mentorUser = await User.findOne({ email: mentorEmail });

    mentor.mentorName = mentorName;
    mentor.mentorEmail = mentorEmail;
    mentor.mentorId = mentorUser ? mentorUser._id : null;

    await mentor.save();

    // If mentor user exists, update department assignment
    if (mentorUser) {
      // Remove department assignment from old mentor if they exist
      const oldMentor = await User.findOne({ department, role: 'mentor' });
      if (oldMentor && oldMentor._id.toString() !== mentorUser._id.toString()) {
        oldMentor.department = undefined;
        await oldMentor.save();
      }

      // Assign new mentor to department
      mentorUser.role = 'mentor';
      mentorUser.department = department;
      await mentorUser.save();
    }

    res.json({
      message: 'Mentor updated successfully',
      mentor: await mentor.populate(['mentorId', 'assignedBy']),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update mentor', error: err.message });
  }
};

// Remove mentor assignment
exports.removeMentor = async (req, res) => {
  try {
    const { department } = req.params;

    // Validate department
    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Invalid department' });
    }

    const mentor = await DepartmentMentor.findOne({ department });
    if (!mentor) {
      return res.status(404).json({ message: 'No mentor assignment found for this department' });
    }

    // Remove department assignment from mentor user
    if (mentor.mentorId) {
      await User.findByIdAndUpdate(mentor.mentorId, { $unset: { department: 1 } });
    }

    await DepartmentMentor.findByIdAndDelete(mentor._id);

    res.json({ message: 'Mentor assignment removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove mentor', error: err.message });
  }
};

// Get students for the mentor's own department
exports.getDepartmentStudents = async (req, res) => {
  try {
    const mentorId = req.user._id;
    const department = req.user.department; // set by middleware/login

    if (!department) {
      return res.status(400).json({ message: 'Your mentor account is not associated with a department' });
    }

    // verify assignment still exists
    const mentorAssignment = await DepartmentMentor.findOne({ department, mentorId });
    if (!mentorAssignment) {
      return res.status(403).json({ message: 'You are not assigned to this department' });
    }

    // Fetch all students from this department including offer-letter fields for mentor visibility
    const students = await User.find({ department, role: 'student' })
      .select('name email profile createdAt offerLetterName offerLetterUrl offerLetterHash branch enrollmentNo department');

    res.json({ department, students });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department students', error: err.message });
  }
};


exports.getInterviewStudents = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const mentorId = req.user._id;
    let department = req.user.department;

    if (!department) {
      const mentorAssignment = await DepartmentMentor.findOne({ mentorId });
      
      if (!mentorAssignment) {
        return res.status(403).json({ message: 'Mentor not assigned to any department' });
      }
      
      department = mentorAssignment.department;
    }

    const students = await User.find({ department, role: 'student' }).select('_id name email');
    
    const studentIds = students.map((s) => s._id);

    if (!studentIds.length) {
      return res.json({ interviews: [], department });
    }

    const queryFilter = {
      studentId: { $in: studentIds },
      $or: [
        { interviewScheduled: true },
        { 'interview.date': { $exists: true, $ne: null } },
      ],
    };

    const populatedInterviews = await Application.find(queryFilter)
      .populate('studentId', 'name email department')
      .populate('jobId', 'title company location')
      .sort({ 'interview.date': 1, 'interview.time': 1, createdAt: -1 })
      .lean();
    
    res.json({ interviews: populatedInterviews, department });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to fetch scheduled interviews', 
      error: err.message
    });
  }
};