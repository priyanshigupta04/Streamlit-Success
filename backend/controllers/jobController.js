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

// GET /api/jobs/recommended — student personalized jobs
exports.getRecommendedJobs = async (req, res) => {
  try {
    // 1. Fetch available jobs
    const jobs = await Job.find({ status: 'open', approvalStatus: 'approved' })
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: -1 });

    if (!jobs || jobs.length === 0) {
      return res.json({ jobs: [] });
    }

    // 2. Format jobs and resume text for the Flask API
    const user = req.user;
    // Construct a logical resume text block combining skills and structured info
    let resumeText = user.resumeText || '';
    if (!resumeText || resumeText.length < 20) {
       // fallback if no parsed text, build a synthetic resume
       const skills = Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || '');
       resumeText = `${user.bio || ''} Education: ${user.branch || ''} ${user.specialization || ''}. Skills: ${skills}. Projects: ${(user.projects || []).join(', ')}.`;
    }

    // Format jobs to strip Mongoose objects
    const jobsPayload = jobs.map(j => ({
      _id: j._id.toString(),
      title: j.title,
      company: j.company,
      domain: j.domain,
      requiredSkills: j.requiredSkills || [],
      jdText: j.description || '',
    }));

    // 3. Call the Python Flask API
    const axios = require('axios');
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:8001';
    
    try {
      const aiResponse = await axios.post(`${flaskUrl}/recommend-jobs`, {
        resume_text: resumeText,
        jobs: jobsPayload,
        profile_completeness: user.profileComplete ? 100 : 50
      });

      // 4. Map the ranked jobs back to their full mongoose schemas
      const rankings = aiResponse.data.rankings || [];
      const rankedJobs = [];
      
      for (const rank of rankings) {
        const fullJob = jobs.find(j => j._id.toString() === rank.jobId);
        if (fullJob) {
          // Send the match score info along with the job document
          rankedJobs.push({
            ...fullJob.toObject(),
            matchData: {
              overallScore: rank.overallScore,
              semantic: rank.semantic,
              skillOverlap: rank.skillOverlap,
              domainMatch: rank.domainMatch,
              matchedSkills: rank.matchedSkills,
              missingSkills: rank.missingSkills
            }
          });
        }
      }

      // if AI returned no matches (rankings empty) or failed to match any job,
      // fall back to unranked job list so frontend still has something to show.
      if (rankedJobs.length === 0) {
        return res.json({ jobs });
      }

      return res.json({ jobs: rankedJobs });
    } catch (aiError) {
      console.error('AI Recommendation failed, returning unranked jobs:', aiError.message);
      // Fallback to unranked if AI is down
      return res.json({ jobs });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
