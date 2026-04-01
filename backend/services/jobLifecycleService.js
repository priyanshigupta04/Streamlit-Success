const Job = require('../models/Job');
const Application = require('../models/Application');

const AUTO_JOB_CLEANUP_ENABLED = String(process.env.AUTO_JOB_CLEANUP_ENABLED || 'true').toLowerCase() !== 'false';
const JOB_CLEANUP_INTERVAL_MINUTES = Number(process.env.JOB_CLEANUP_INTERVAL_MINUTES || 60);
const JOB_DELETE_GRACE_DAYS = Number(process.env.JOB_DELETE_GRACE_DAYS || 0);

let cleanupTimer = null;

const getExpiryVisibilityFilter = (now = new Date()) => ({
  $or: [
    { deadline: { $exists: false } },
    { deadline: null },
    { deadline: { $gte: now } },
  ],
});

const runExpiredJobCleanup = async () => {
  const now = new Date();
  const graceMs = Math.max(0, JOB_DELETE_GRACE_DAYS) * 24 * 60 * 60 * 1000;
  const deleteBefore = new Date(now.getTime() - graceMs);

  // Step 1: close all open jobs whose deadline has passed
  const closeResult = await Job.updateMany(
    {
      status: 'open',
      deadline: { $ne: null, $lt: now },
    },
    {
      $set: { status: 'closed' },
    }
  );

  // Step 2: delete jobs that crossed grace period beyond deadline
  const jobsToDelete = await Job.find(
    {
      deadline: { $ne: null, $lt: deleteBefore },
    },
    { _id: 1 }
  ).lean();

  const jobIds = jobsToDelete.map((j) => j._id);

  let deletedApplications = { deletedCount: 0 };
  let deletedJobs = { deletedCount: 0 };

  if (jobIds.length > 0) {
    deletedApplications = await Application.deleteMany({ jobId: { $in: jobIds } });
    deletedJobs = await Job.deleteMany({ _id: { $in: jobIds } });
  }

  return {
    closedJobs: closeResult.modifiedCount || 0,
    deletedJobs: deletedJobs.deletedCount || 0,
    deletedApplications: deletedApplications.deletedCount || 0,
    deleteBefore,
  };
};

const startJobLifecycleService = () => {
  if (!AUTO_JOB_CLEANUP_ENABLED) {
    console.log('Job lifecycle cleanup is disabled (AUTO_JOB_CLEANUP_ENABLED=false)');
    return;
  }

  const intervalMs = Math.max(5, JOB_CLEANUP_INTERVAL_MINUTES) * 60 * 1000;

  const executeCleanup = async () => {
    try {
      const stats = await runExpiredJobCleanup();
      if (stats.closedJobs || stats.deletedJobs || stats.deletedApplications) {
        console.log(
          `[JobLifecycle] closed=${stats.closedJobs}, deletedJobs=${stats.deletedJobs}, deletedApplications=${stats.deletedApplications}, graceDays=${JOB_DELETE_GRACE_DAYS}`
        );
      }
    } catch (err) {
      console.error('[JobLifecycle] cleanup failed:', err.message);
    }
  };

  // Run once at startup and then periodically.
  executeCleanup();
  cleanupTimer = setInterval(executeCleanup, intervalMs);
  if (cleanupTimer.unref) cleanupTimer.unref();

  console.log(
    `[JobLifecycle] started: every ${Math.max(5, JOB_CLEANUP_INTERVAL_MINUTES)} min, delete grace ${JOB_DELETE_GRACE_DAYS} day(s)`
  );
};

module.exports = {
  startJobLifecycleService,
  runExpiredJobCleanup,
  getExpiryVisibilityFilter,
};
