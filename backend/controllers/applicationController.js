const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");
const Notification = require("../models/Notification");

const buildSenderMeta = (req) => ({
  sender: {
    id: req?.user?._id || null,
    name: req?.user?.name || '',
    role: req?.user?.role || '',
  },
});

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
      '📩 New Application Received',
      `${student?.name || 'A student'} has applied for the role of ${job.title} at ${job.company}${job.location ? ` (${job.location})` : ''}. Review their profile on your dashboard.`,
      `/recruiter-dashboard`,
      buildSenderMeta(req)
    );

    // Notify mentor if student has one
    if (student?.mentorId) {
      await Notification.send(
        student.mentorId, 'application_status',
        '📋 Student Applied for a Job',
        `Your student ${student?.name || 'A student'} has applied for ${job.title} at ${job.company}${job.location ? ` (${job.location})` : ''}. Please review and approve/reject from your Mentor Dashboard.`,
        `/mentor-dashboard`,
        buildSenderMeta(req)
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
      .sort({ createdAt: -1 })
      .lean();

    const applications = apps.map(app => ({
      ...app,
      interview: app.interview || null
    }));

    res.json({ applications });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/applications/:id — student deletes own application from submission history
exports.deleteMyApplication = async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    if (app.studentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await app.deleteOne();
    res.json({ message: 'Application deleted successfully' });
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

// GET /api/applications/scheduled/mine — recruiter views all scheduled interviews across own jobs
exports.getMyScheduledInterviews = async (req, res) => {
  try {
    const recruiterJobs = await Job.find({ postedBy: req.user._id }).select('_id');
    const jobIds = recruiterJobs.map((job) => job._id);

    if (!jobIds.length) {
      return res.json({ interviews: [] });
    }

    const interviews = await Application.find({
      jobId: { $in: jobIds },
      $or: [
        { interviewScheduled: true },
        { 'interview.date': { $exists: true, $ne: null } },
      ],
    })
      .populate('studentId', 'name email')
      .populate('jobId', 'title company location')
      .sort({ 'interview.date': 1, 'interview.time': 1, createdAt: -1 })
      .lean();

    res.json({ interviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/applications/all — mentor/placement_cell sees all student applications
exports.getAllApplications = async (req, res) => {
  try {
    let query = {};
    
    // If user is a mentor, restrict to students in their department.
    // Use mentorId fallback if department is missing.
    if (req.user.role === 'mentor') {
      if (req.user.department) {
        const deptStudents = await User.find({ department: req.user.department, role: 'student' }).select('_id');
        const studentIds = deptStudents.map(s => s._id);
        if (studentIds.length > 0) {
          query = { studentId: { $in: studentIds } };
        }
      } else {
        // no department? fall back to assigned students by mentorId
        const mentorStudents = await User.find({ mentorId: req.user._id }).select('_id');
        const studentIds = mentorStudents.map(s => s._id);
        if (studentIds.length > 0) {
          query = { studentId: { $in: studentIds } };
        }
      }
      // If still no students found, show all apps as before
    }
    if (req.user.role === 'hod' && req.user.department) {
      const deptStudents = await User.find({ department: req.user.department, role: 'student' }).select('_id');
      const studentIds = deptStudents.map((s) => s._id);
      query = { studentId: { $in: studentIds } };
    }
    // For placement_cell and dean: show all applications (query = {})

    const apps = await Application.find(query)
  .populate('studentId', 'name email department')
  .populate('jobId', 'title company location stipend status type')
  .sort({ createdAt: -1 })
  .lean();

const applications = apps.map(app => ({
  ...app,
  interview: app.interview || null
}));

res.json({ applications });
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
        `/mentor-dashboard`,
        buildSenderMeta(req)
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
    const {
      status,
      recruiterNote,
      joiningDate,
      joiningStatus,
      ctc,
      workMode,
      employmentType,
      offerAcceptedAt,
      organizationName,
      joiningLocation,
    } = req.body;
    const app = await Application.findById(req.params.id).populate('jobId', 'title postedBy');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Authorization: if app has a jobId, check recruiter owns it; otherwise allow any recruiter
    if (app.jobId && app.jobId.postedBy) {
      if (app.jobId.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'placement_cell') {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    // If no jobId (old quick-apply), any recruiter can update

    const validStatuses = [
      'applied', 'under_review', 'shortlisted', 'interview', 'interview_scheduled',
      'selected', 'offered', 'rejected', 'offer_accepted', 'offer_declined'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status: ${status}` });
    }

    app.status = status;
    if (recruiterNote) app.recruiterNote = recruiterNote;
    if (joiningDate !== undefined) app.joiningDate = joiningDate || null;
    if (joiningStatus !== undefined) app.joiningStatus = joiningStatus || 'pending';
    if (ctc !== undefined) app.ctc = ctc || '';
    if (workMode !== undefined) app.workMode = workMode || undefined;
    if (employmentType !== undefined) app.employmentType = employmentType || '';
    if (offerAcceptedAt !== undefined) app.offerAcceptedAt = offerAcceptedAt || null;
    if (organizationName !== undefined) app.organizationName = organizationName || '';
    if (joiningLocation !== undefined) app.joiningLocation = joiningLocation || '';

    if (status === 'offer_accepted' && !app.offerAcceptedAt) {
      app.offerAcceptedAt = new Date();
    }

    await app.save();

    const jobTitle = app.jobId?.title || app.jobTitle || 'the position';
    const company = app.jobId?.company || app.company || '';
    const location = app.jobId?.location || app.location || '';
    const jobInfo = company ? `${jobTitle} at ${company}${location ? ` (${location})` : ''}` : jobTitle;

    const statusTitles = {
      under_review:        '🔍 Application Under Review',
      shortlisted:         '⭐ You\'ve Been Shortlisted!',
      interview:           '📅 Interview Invitation',
      interview_scheduled: '📅 Interview Scheduled',
      selected:            '🎉 Congratulations — Selected!',
      offered:             '🎁 Job Offer Received',
      rejected:            '❌ Application Update',
    };

    const statusMessages = {
      under_review:        `Your application for ${jobInfo} is currently under review by the recruiter. We'll keep you posted.`,
      shortlisted:         `Great news! You have been shortlisted for ${jobInfo}. The recruiter will contact you soon regarding next steps.`,
      interview:           `You've been invited for an interview for ${jobInfo}. Please check your email and be prepared. Best of luck!`,
      interview_scheduled: `Your interview has been scheduled for ${jobInfo}. Check your email for details and timing.`,
      selected:            `Congratulations! 🎊 You have been selected for ${jobInfo}. The recruiter will reach out with further details.`,
      offered:             `You have received a job offer for ${jobInfo}! Please review the offer and respond at your earliest convenience.`,
      rejected:            `We regret to inform you that your application for ${jobInfo} was not selected this time. Keep applying — good luck!`,
    };

    if (statusMessages[status]) {
      await Notification.send(
        app.studentId, 'application_status',
        statusTitles[status] || 'Application Update',
        statusMessages[status],
        '/student-dashboard',
        buildSenderMeta(req)
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

    // Check if application is from a student assigned to this mentor (only enforce if student has a mentorId set)
    if (app.studentId.mentorId && app.studentId.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized - student not assigned to you' });
    }

    // Approve the application
    app.mentorApproval = {
      status: 'approved',
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
      '/student-dashboard',
      buildSenderMeta(req)
    );

    res.json({ 
      message: 'Application approved successfully',
      application: app 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/applications/:id/mentor-reject — mentor rejects an application from their student
exports.mentorRejectApplication = async (req, res) => {
  try {
    const { mentorNote } = req.body;
    const app = await Application.findById(req.params.id).populate('studentId', 'name mentorId email');
    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Check if application is from a student assigned to this mentor (only enforce if student has a mentorId set)
    if (app.studentId.mentorId && app.studentId.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized - student not assigned to you' });
    }

    // Reject the application
    app.mentorApproval = {
      status: 'rejected',
      approvedAt: new Date(),
      mentorNote: mentorNote || '',
    };
    await app.save();

    // Notify student that mentor rejected their application
    const jobTitle = app.jobId?.title || app.jobTitle || 'your application';
    await Notification.send(
      app.studentId._id, 'application_status',
      'Application Rejected by Mentor', 
      `Your mentor has rejected your application for ${jobTitle}. Reason: ${mentorNote || 'No reason provided.'}`,
      '/student-dashboard',
      buildSenderMeta(req)
    );

    res.json({ 
      message: 'Application rejected successfully',
      application: app 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// PUT /api/applications/:id/schedule-interview — recruiter schedules interview
exports.scheduleInterview = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const { date, time, mode, meetingLink, location } = req.body;

    const app = await Application.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('jobId', 'title company postedBy');

    if (!app) return res.status(404).json({ message: 'Application not found' });

    // Authorization check
    if (app.jobId && app.jobId.postedBy) {
      if (
        app.jobId.postedBy.toString() !== req.user._id.toString() &&
        req.user.role !== 'placement_cell'
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    // Update interview details
    app.status = 'interview_scheduled';
    app.interviewScheduled = true;

    app.interviewDetails = {
      date,
      time,
      mode,
      meetingLink: meetingLink || '',
      location: location || ''
    };

    app.interviewScheduledBy = req.user._id;

    await app.save();

    const jobTitle = app.jobId?.title || app.jobTitle || 'the position';
    const company = app.jobId?.company || app.company || '';

    // Notify student
    await Notification.send(
      app.studentId._id,
      'application_status',
      '📅 Interview Scheduled',
      `Your interview for ${jobTitle} at ${company} is scheduled on ${date} at ${time}. ${meetingLink ? `Join here: ${meetingLink}` : ""}`,
      '/student-dashboard',
      buildSenderMeta(req)
    );

    // Notify mentor (if exists)
    const student = await User.findById(app.studentId._id).select('mentorId name');
    if (student?.mentorId) {
      await Notification.send(
        student.mentorId,
        'application_status',
        '📅 Student Interview Scheduled',
        `${student.name}'s interview for ${jobTitle} ${company ? `at ${company}` : ''} is scheduled on ${date} at ${time}.`,
        '/mentor-dashboard',
        buildSenderMeta(req)
      );
    }

    res.json({
      message: 'Interview scheduled successfully',
      application: app
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};