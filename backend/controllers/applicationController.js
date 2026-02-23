const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const Notification = require("../models/Notification");

// POST /api/jobs/:jobId/apply — student applies
exports.applyToJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const studentId = req.user._id;

    const exists = await Application.findOne({ studentId, jobId });
    if (exists) {
      return res.status(400).json({ 
        message: 'You have already applied for this job',
        code: 'ALREADY_APPLIED'
      });
    }

    const job = await Job.findById(jobId);
    if (!job || job.status !== 'open')
      return res.status(400).json({ message: 'Job is not open' });
    if (job.deadline && new Date() > job.deadline)
      return res.status(400).json({ message: 'Application deadline passed' });

    const student = await User.findById(studentId).select('resumeUrl mentorId name');

    const application = await Application.create({
      studentId, jobId,
      resumeUrl: student.resumeUrl || '',
      coverNote: req.body.coverNote || '',
      status: 'applied',
    });

    // Notify recruiter about new application
    await Notification.send(
      job.postedBy, 'application_status',
      'New Application', `A student applied for ${job.title}`,
      `/recruiter-dashboard`
    );

    // Notify mentor if student has one
    if (student?.mentorId) {
      await Notification.send(
        student.mentorId, 'application_status',
        'Student Application', `${student?.name || 'A student'} has applied for ${job.title} at ${job.company}`,
        `/mentor-dashboard`
      );
    }

    res.status(201).json({ application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'You have already applied for this job',
        code: 'ALREADY_APPLIED'
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/mine — student's own applications
exports.getMyApplications = async (req, res) => {
  try {
    const apps = await Application.find({ studentId: req.user._id })
      .populate('jobId', 'title company location stipend status type')
      .sort({ createdAt: -1 });
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:jobId/applicants — recruiter views applicants
exports.getApplicants = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'placement_cell') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const apps = await Application.find({ jobId })
      .populate('studentId', 'name email branch cgpa skills resumeUrl phone')
      .sort({ createdAt: -1 });

    res.json({ applicants: apps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/all — mentor/placement_cell sees all student applications
exports.getAllApplications = async (req, res) => {
  try {
    let query = {};
    
    // If user is a mentor, only show applications from their assigned students
    if (req.user.role === 'mentor') {
      const mentorStudents = await User.find({ mentorId: req.user._id }).select('_id');
      const studentIds = mentorStudents.map(s => s._id);
      if (studentIds.length === 0) {
        // No students assigned to this mentor
        return res.json({ applications: [] });
      }
      query = { studentId: { $in: studentIds } };
    }
    // For placement_cell, hod, dean: show all applications

    const apps = await Application.find(query)
      .populate('studentId', 'name email branch cgpa skills resumeUrl mentorId')
      .populate('jobId', 'title company location stipend postedBy')
      .sort({ createdAt: -1 });
    
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/applications/quick — student quick-applies to a hardcoded job
exports.quickApply = async (req, res) => {
  try {
    const { company, jobTitle, location, stipend, localJobId } = req.body;
    if (!company || !jobTitle) return res.status(400).json({ message: 'company and jobTitle are required' });

    // Prevent duplicate quick-apply for same student + same job
    const exists = await Application.findOne({ studentId: req.user._id, company, jobTitle });
    if (exists) {
      return res.status(400).json({ 
        message: 'You have already applied for this position', 
        code: 'ALREADY_APPLIED' 
      });
    }

    const student = await User.findById(req.user._id).select('resumeUrl');
    const app = await Application.create({
      studentId: req.user._id,
      company, jobTitle, location: location || '', stipend: stipend || '',
      resumeUrl: student?.resumeUrl || '',
      status: 'applied',
    });

    // Notify mentor if student has one
    if (student?.mentorId) {
      await Notification.send(
        student.mentorId, 'application_status',
        'Student Application', `${student?.name || 'A student'} has applied for ${jobTitle} at ${company}`,
        `/mentor-dashboard`
      );
    }

    res.status(201).json({ application: app });
  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'You have already applied for this position',
        code: 'ALREADY_APPLIED'
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/applications/:id/status — recruiter updates application status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, recruiterNote } = req.body;
    const app = await Application.findById(req.params.id).populate('jobId', 'title postedBy');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    if (app.jobId.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'placement_cell') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const validStatuses = ['applied','shortlisted','interview_scheduled','selected','rejected','offer_accepted','offer_declined'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    app.status = status;
    if (recruiterNote) app.recruiterNote = recruiterNote;
    await app.save();

    const statusMessages = {
      shortlisted: `You have been shortlisted for ${app.jobId.title}!`,
      interview_scheduled: `Interview scheduled for ${app.jobId.title}`,
      selected: `Congratulations! You have been selected for ${app.jobId.title}!`,
      rejected: `Your application for ${app.jobId.title} was not selected.`,
    };

    if (statusMessages[status]) {
      await Notification.send(
        app.studentId, 'application_status',
        'Application Update', statusMessages[status],
        '/student-dashboard'
      );
    }

    res.json({ application: app });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// PUT /api/applications/:id/mentor-approve — mentor approves an application from their student
exports.mentorApproveApplication = async (req, res) => {
  try {
    const { mentorNote } = req.body;
    const app = await Application.findById(req.params.id).populate('studentId', 'name mentorId email');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Check if application is from a student assigned to this mentor
    if (app.studentId.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized - student not assigned to you' });
    }

    // Approve the application
    app.mentorApproval = {
      approved: true,
      approvedAt: new Date(),
      mentorNote: mentorNote || '',
    };
    await app.save();

    // Notify student that mentor approved their application
    const jobTitle = app.jobId?.title || app.jobTitle || 'your application';
    await Notification.send(
      app.studentId._id, 'application_status',
      'Application Approved by Mentor', 
      `Your mentor has approved your application for ${jobTitle}. It will now be forwarded to the recruiter.`,
      '/student-dashboard'
    );

    res.json({ 
      message: 'Application approved successfully',
      application: app 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};