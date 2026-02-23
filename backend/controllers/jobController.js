const Job = require("../models/Job");
const Notification = require("../models/Notification");

// POST /api/jobs — recruiter creates a job
exports.createJob = async (req, res) => {
  try {
    const { title, company, type, domain, description,
            requiredSkills, stipend, location, duration,
            deadline, eligibility } = req.body;

    const job = await Job.create({
      title, company, type, domain, description,
      requiredSkills: requiredSkills || [],
      stipend, location, duration, deadline, eligibility,
      postedBy: req.user._id,
      jdText: description,
      status: 'open',
      approvalStatus: 'pending',
    });

    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs — list jobs with optional filters
exports.getJobs = async (req, res) => {
  try {
    const { status, type, domain, search } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (domain) filter.domain = domain;

    // Build approval status filter
    if (!req.user || req.user.role !== 'placement_cell') {
      // Students & others see: approved jobs OR (pending jobs that are still open)
      filter.$or = [
        { approvalStatus: 'approved' },
        { approvalStatus: 'pending', status: 'open' }
      ];
    }
    // placement_cell sees all regardless of approval status

    // Add search filter if provided
    if (search) {
      const searchFilter = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      
      // Combine with existing $or if it exists
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: searchFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const jobs = await Job.find(filter)
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/:id
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name companyName email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/jobs/:id — update job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'placement_cell') {
      return res.status(403).json({ message: 'Not authorized to edit this job' });
    }

    const allowed = ['title','company','type','domain','description','requiredSkills',
      'stipend','location','duration','deadline','eligibility','status'];
    allowed.forEach(f => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    if (req.body.description) job.jdText = req.body.description;

    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'placement_cell') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/pending — placement_cell: list pending approvals
exports.getPendingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ approvalStatus: 'pending' })
      .populate('postedBy', 'name companyName email')
      .sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/jobs/:id/approve — placement_cell approves job
exports.approveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.approvalStatus = 'approved';
    job.approvedBy = req.user._id;
    await job.save();

    // notify recruiter
    await Notification.send(job.postedBy, 'announcement', 'Job Approved', `Your job "${job.title}" was approved and is now visible to students.`, `/jobs/${job._id}`);

    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/jobs/:id/reject — placement_cell rejects job with reason
exports.rejectJob = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    job.approvalStatus = 'rejected';
    job.rejectionReason = reason || '';
    await job.save();

    // notify recruiter with reason
    await Notification.send(job.postedBy, 'announcement', 'Job Rejected', `Your job "${job.title}" was rejected. Reason: ${job.rejectionReason || 'No reason provided'}.`, `/jobs/${job._id}`);

    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/jobs/my — recruiter's own jobs
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
