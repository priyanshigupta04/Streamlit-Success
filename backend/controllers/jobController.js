const Job = require("../models/Job");
const Notification = require("../models/Notification");
const Application = require("../models/Application");
const User = require("../models/User");
const { getExpiryVisibilityFilter } = require('../services/jobLifecycleService');

const AI_TIMEOUT_MS = Math.min(Number(process.env.AI_TIMEOUT_MS || 120000), 10000);
const DEFAULT_AI_SERVICE_URL = 'https://streamlit-success-ai.onrender.com';

const buildSenderMeta = (req) => ({
  sender: {
    id: req?.user?._id || null,
    name: req?.user?.name || '',
    role: req?.user?.role || '',
  },
});

const normalizeSkillList = (skills) => {
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean);
  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeStringList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

const buildResumeContextFromProfile = (user) => {
  const skills = normalizeSkillList(user.skills);
  const projects = normalizeStringList(user.projects);
  const certifications = normalizeStringList(user.certifications);

  const sections = [
    `Name: ${user.name || ''}`,
    `Email: ${user.email || ''}`,
    `Department: ${user.department || ''}`,
    `Branch: ${user.branch || ''}`,
    `Specialization: ${user.specialization || ''}`,
    `Semester: ${user.semester || ''}`,
    `CGPA: ${user.cgpa || ''}`,
    `Skills: ${skills.join(', ')}`,
    `Projects: ${projects.join(', ')}`,
    `Certifications: ${certifications.join(', ')}`,
    `Bio: ${user.bio || ''}`,
    `Internship Reason: ${user.internshipReason || ''}`,
  ];

  return sections
    .map((part) => part.trim())
    .filter((part) => part && !part.endsWith(':'))
    .join('. ');
};

const mapRankingsToJobs = (jobs, rankings) => {
  const rankedJobs = [];

  for (const rank of rankings || []) {
    const fullJob = jobs.find((j) => j._id.toString() === String(rank.jobId));
    if (!fullJob) continue;

    rankedJobs.push({
      ...fullJob.toObject(),
      matchData: {
        overallScore: rank.overallScore,
        semantic: rank.semantic,
        skillOverlap: rank.skillOverlap,
        domainMatch: rank.domainMatch,
        matchedSkills: rank.matchedSkills || [],
        missingSkills: rank.missingSkills || [],
      },
    });
  }

  return rankedJobs;
};

const canonicalizeSkill = (skill) => {
  const raw = String(skill || '').toLowerCase().trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/\b(basic|intermediate|advanced|beginner)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const compact = cleaned.replace(/[\s._-]+/g, '');

  if (compact === 'reactjs' || cleaned === 'react js' || cleaned === 'react') return 'react';
  if (compact === 'nodejs' || cleaned === 'node js' || cleaned === 'node') return 'node.js';
  if (cleaned === 'js' || compact === 'javascript') return 'javascript';
  if (compact === 'html5' || cleaned === 'html') return 'html';
  if (compact === 'css3' || cleaned === 'css') return 'css';
  if (compact === 'nextjs' || cleaned === 'next js' || cleaned === 'next.js') return 'next.js';
  if (compact === 'angularjs' || cleaned.includes('angular')) return 'angular';

  return cleaned;
};

const hasFrontendStack = (skills) => {
  const set = new Set(skills || []);
  return set.has('react') || set.has('javascript') || set.has('html') || set.has('css') || set.has('next.js');
};

const rankJobsHeuristically = (jobs, userSkills) => {
  const skillSet = new Set((userSkills || []).map(canonicalizeSkill).filter(Boolean));

  const scored = jobs.map((job) => {
    const title = String(job.title || '').toLowerCase();
    const domain = String(job.domain || '').toLowerCase();
    const description = String(job.description || '').toLowerCase();
    const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
    const normalizedRequired = requiredSkills.map(canonicalizeSkill).filter(Boolean);

    const matchedSkills = normalizedRequired.filter((s) => skillSet.has(s));
    const missingSkills = normalizedRequired.filter((s) => !skillSet.has(s));

    let keywordBoost = 0;
    for (const skill of skillSet) {
      if (!skill) continue;
      if (title.includes(skill)) keywordBoost += 18;
      else if (description.includes(skill)) keywordBoost += 6;
    }

    if (title.includes('react') && skillSet.has('react')) keywordBoost += 20;
    if ((title.includes('frontend') || domain.includes('frontend')) && hasFrontendStack(skillSet)) keywordBoost += 10;

    const overlapScore = normalizedRequired.length
      ? Math.round((matchedSkills.length / normalizedRequired.length) * 100)
      : 55;

    let intentBoost = 0;
    if (title.includes('react') && skillSet.has('react')) intentBoost += 10;
    if (title.includes('frontend') && skillSet.has('react')) intentBoost += 3;

    const overallScore = Math.max(0, Math.min(100, Math.round(overlapScore * 0.7 + keywordBoost * 0.3 + intentBoost)));

    return {
      ...job.toObject(),
      matchData: {
        overallScore,
        semantic: null,
        skillOverlap: overlapScore,
        domainMatch: null,
        matchedSkills,
        missingSkills,
      },
    };
  });

  scored.sort((a, b) => (b.matchData?.overallScore || 0) - (a.matchData?.overallScore || 0));
  return scored;
};

const getAxiosErrorMessage = (err) => {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    'service unavailable'
  );
};

const estimateProfileCompleteness = (user) => {
  const checks = [
    !!(user.name && user.name.trim()),
    !!(user.email && user.email.trim()),
    !!(user.branch && String(user.branch).trim()),
    !!(user.cgpa && String(user.cgpa).trim()),
    normalizeSkillList(user.skills).length > 0,
    !!(user.resumeUrl && String(user.resumeUrl).trim()),
    !!(user.resumeText && String(user.resumeText).trim()),
    normalizeStringList(user.projects).length > 0,
    !!(user.linkedin && String(user.linkedin).trim()),
    !!(user.github && String(user.github).trim()),
  ];

  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return Math.min(100, Math.max(10, score));
};

const buildStudentVisibleJobFilter = (now = new Date()) => ({
  $and: [
    {
      $or: [
        { status: 'open' },
        { status: { $exists: false } },
        { status: null },
      ],
    },
    {
      $or: [
        { approvalStatus: 'approved' },
        { approvalStatus: 'pending' },
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
      ],
    },
    getExpiryVisibilityFilter(now),
  ],
});

// POST /api/jobs — recruiter creates a job
exports.createJob = async (req, res) => {
  try {
    const { title, company, type, domain, description,
            requiredSkills, stipend, location, duration,
            deadline, eligibility,
            companyAddress, companyCity, companyState, companyWebsite, companyTechDomain } = req.body;

    const initialStatus = isExpiredDeadline(deadline) ? 'closed' : 'open';

    const job = await Job.create({
      title, company, type, domain, description,
      requiredSkills: requiredSkills || [],
      stipend, location, duration, deadline, eligibility,
      companyAddress, companyCity, companyState, companyWebsite, companyTechDomain,
      postedBy: req.user._id,
      jdText: description,
      status: initialStatus,
      approvalStatus: 'pending',
    });

    try {
      const placementUsers = await User.find({ role: 'placement_cell' }).select('_id').lean();
      if (placementUsers.length) {
        const recruiterName = req.user?.name || 'Recruiter';
        const placementNotifications = placementUsers.map((u) => ({
          userId: u._id,
          type: 'announcement',
          title: 'New Job Posted',
          message: `${recruiterName} posted a new job: ${title} at ${company}. Please review for approval.`,
          link: '/placement-cell-dashboard',
          senderId: req.user?._id || null,
          senderName: recruiterName,
          senderRole: req.user?.role || 'recruiter',
        }));
        await Notification.insertMany(placementNotifications);
        console.log(`✅ Sent job posting notification to ${placementUsers.length} placement_cell users`);
      }
    } catch (notifyErr) {
      console.error('Failed to notify placement cell for new job:', notifyErr.message);
    }

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
    const andFilters = [];
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (domain) filter.domain = domain;

    // Build student visibility filter
    if (!req.user || req.user.role !== 'placement_cell') {
      // Students & others see currently available jobs, including legacy records with missing status fields.
      andFilters.push(buildStudentVisibleJobFilter(new Date()));
    }
    // placement_cell sees all regardless of approval status

    // Add search filter if provided
    if (search) {
      const searchFilter = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      
      andFilters.push({ $or: searchFilter });
    }

    if (andFilters.length > 0) {
      filter.$and = andFilters;
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
      'stipend','location','duration','deadline','eligibility','status',
      'companyAddress','companyCity','companyState','companyWebsite','companyTechDomain'];
    allowed.forEach(f => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    if (req.body.description) job.jdText = req.body.description;

    if (isExpiredDeadline(job.deadline)) {
      job.status = 'closed';
    }

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
    await Notification.send(job.postedBy, 'announcement', 'Job Approved', `Your job "${job.title}" was approved and is now visible to students.`, `/jobs/${job._id}`, buildSenderMeta(req));

    // notify all students about the approved job
    try {
      const studentUsers = await User.find({ role: 'student' }).select('_id').lean();
      if (studentUsers.length) {
        const recruiterName = job.postedBy?.name || 'Recruiter';
        const studentNotifications = studentUsers.map((u) => ({
          userId: u._id,
          type: 'announcement',
          title: 'New Job Opportunity',
          message: `New job posted at ${job.company}: ${job.title} - ${job.location}. Check out the details and apply now!`,
          link: `/jobs/${job._id}`,
          senderId: job.postedBy || null,
          senderName: recruiterName,
          senderRole: 'recruiter',
        }));
        await Notification.insertMany(studentNotifications);
        console.log(`✅ Sent job approval notification to ${studentUsers.length} students`);
      }
    } catch (studentNotifyErr) {
      console.error('Failed to notify students for approved job:', studentNotifyErr.message);
    }

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
    await Notification.send(job.postedBy, 'announcement', 'Job Rejected', `Your job "${job.title}" was rejected. Reason: ${job.rejectionReason || 'No reason provided'}.`, `/jobs/${job._id}`, buildSenderMeta(req));

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
    const jobs = await Job.find(buildStudentVisibleJobFilter(new Date()))
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: -1 });

    if (!jobs || jobs.length === 0) {
      return res.json({ jobs: [] });
    }

    // 2. Format jobs and resume text for the Flask API
    const user = req.user;
    const aiMeta = {
      serviceStatus: { recommendation: 'not_called', analysis: 'not_called' },
      warnings: [],
      resumeSource: 'profile',
      jobsConsidered: jobs.length,
      profileCompleteness: estimateProfileCompleteness(user),
      usedFallbackRanking: false,
      profileSnapshot: {
        branch: user.branch || '',
        specialization: user.specialization || '',
        semester: user.semester || null,
        cgpa: user.cgpa || '',
        skillCount: normalizeSkillList(user.skills).length,
      },
    };

    let resumeText = (user.resumeText || '').trim();
    if (resumeText.length >= 20) {
      aiMeta.resumeSource = 'resumeText';
    } else if (user.resumeUrl) {
      // Try rebuilding missing resumeText from already uploaded resume URL.
      try {
        const axios = require('axios');
        const fastApiUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
        const parseResponse = await axios.post(
          `${fastApiUrl}/parse-resume-url`,
          { resume_url: user.resumeUrl },
          { timeout: AI_TIMEOUT_MS }
        );

        const parsedFields = parseResponse.data?.fields || {};
        const parsedText = String(parsedFields.resumeText || '').trim();

        if (parsedText.length >= 20) {
          resumeText = parsedText;
          aiMeta.resumeSource = 'resumeUrlParsed';

          // Persist only raw resume text for AI usage; keep profile fields manual/user-controlled.
          await User.findByIdAndUpdate(user._id, { resumeText: parsedText }, { new: false });
        } else {
          aiMeta.warnings.push('Resume URL parse returned insufficient text, using profile fallback.');
        }
      } catch (parseErr) {
        aiMeta.warnings.push(`Resume re-parse failed: ${getAxiosErrorMessage(parseErr)}`);
      }
    }

    if (!resumeText || resumeText.length < 20) {
      resumeText = buildResumeContextFromProfile(user);
      aiMeta.resumeSource = 'profileSynthesized';
    }

    if (!resumeText || resumeText.length < 20) {
      aiMeta.usedFallbackRanking = true;
      aiMeta.serviceStatus.recommendation = 'fallback';
      aiMeta.warnings.push('Insufficient profile context for AI ranking. Showing profile-skill fallback ranking.');
      const heuristicRanked = rankJobsHeuristically(jobs, normalizeSkillList(user.skills));
      return res.json({ jobs: heuristicRanked, ai: { analysis: null, meta: aiMeta } });
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

    // 3. Call Python AI services (analysis + recommendation)
    const axios = require('axios');
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:8001';
    const fastApiUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
    let analysis = null;

    try {
      const analysisResponse = await axios.post(
        `${fastApiUrl}/analyze`,
        { resume_text: resumeText },
        { timeout: AI_TIMEOUT_MS }
      );
      analysis = analysisResponse.data || null;
      aiMeta.serviceStatus.analysis = 'ok';
    } catch (analysisError) {
      aiMeta.serviceStatus.analysis = 'failed';
      aiMeta.warnings.push(`Profile analysis unavailable: ${analysisError.message}`);
    }
    
    let rankingError = null;
    let rankedJobs = [];

    // Preferred: FastAPI recommendation endpoint
    try {
      const aiResponse = await axios.post(`${fastApiUrl}/recommend`, {
        resume_text: resumeText,
        jobs: jobsPayload,
        profile_completeness: aiMeta.profileCompleteness,
      }, { timeout: AI_TIMEOUT_MS });

      rankedJobs = mapRankingsToJobs(jobs, aiResponse.data.rankings || []);
      if (rankedJobs.length > 0) {
        aiMeta.serviceStatus.recommendation = 'ok';
        return res.json({ jobs: rankedJobs, ai: { analysis, meta: aiMeta } });
      }
    } catch (fastApiRecommendError) {
      rankingError = fastApiRecommendError;
    }

    // Secondary: legacy Flask endpoint
    try {
      const aiResponse = await axios.post(`${flaskUrl}/recommend-jobs`, {
        resume_text: resumeText,
        jobs: jobsPayload,
        profile_completeness: aiMeta.profileCompleteness,
      }, { timeout: AI_TIMEOUT_MS });

      rankedJobs = mapRankingsToJobs(jobs, aiResponse.data.rankings || []);
      if (rankedJobs.length > 0) {
        aiMeta.serviceStatus.recommendation = 'ok';
        aiMeta.warnings.push('Using legacy ranking service fallback.');
        return res.json({ jobs: rankedJobs, ai: { analysis, meta: aiMeta } });
      }
    } catch (flaskRecommendError) {
      rankingError = rankingError || flaskRecommendError;
    }

    // Final: deterministic local ranking
    aiMeta.serviceStatus.recommendation = 'fallback';
    aiMeta.usedFallbackRanking = true;
    aiMeta.warnings.push(`AI recommendation unavailable: ${getAxiosErrorMessage(rankingError)}`);
    aiMeta.warnings.push('Showing profile-skill-based fallback ranking.');
    const heuristicRanked = rankJobsHeuristically(jobs, normalizeSkillList(user.skills));
    return res.json({ jobs: heuristicRanked, ai: { analysis, meta: aiMeta } });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// PUT /api/jobs/:id/shortlist — recruiter shortlists students

exports.shortlistStudent = async (req, res) => {
  try {
    const { students, status } = req.body; // frontend se array + status le
    const jobId = req.params.id; // route me :id use kar rahe ho

    const updatedApplications = [];

    for (const studentId of students) {
      const app = await Application.findOneAndUpdate(
        { studentId, jobId },
        { status: status }, // dynamic status
        { new: true }
      );
      if (app) updatedApplications.push(app);
    }

    res.json({
      message: "Applications updated",
      updatedApplications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// PUT /api/jobs/:id/shortlist — recruiter shortlists students or updates status
exports.updateStudentApplications = async (req, res) => {
  try {
    const { students, status } = req.body; // frontend se array + status le
    const jobId = req.params.id;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No students selected" });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const updatedApplications = [];

    for (const studentId of students) {
      const app = await Application.findOneAndUpdate(
        { studentId, jobId },
        { status: status },
        { new: true, upsert: false } // ensure existing application
      );
      if (app) updatedApplications.push(app);
    }

    res.json({
      message: "Applications updated successfully",
      updatedApplications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const isExpiredDeadline = (deadlineValue) => {
  if (!deadlineValue) return false;
  const parsed = new Date(deadlineValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed < new Date();
};