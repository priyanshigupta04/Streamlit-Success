const express = require("express");
const router = express.Router();
const { shortlistStudent } = require("../controllers/jobController");

router.post("/:jobId/shortlist", shortlistStudent);

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs,
  getPendingJobs, approveJob, rejectJob, getRecommendedJobs
} = require("../controllers/jobController");

// list public jobs (students see only approved)
router.get("/",       protect, getJobs);
// personalized recommended jobs for students
router.get("/recommended", protect, authorize("student"), getRecommendedJobs);
// pending approvals for placement cell
router.get("/pending", protect, authorize("placement_cell"), getPendingJobs);
router.get("/mine",   protect, authorize("recruiter"), getMyJobs);
router.get("/:id",    protect, getJob);
router.post("/",      protect, authorize("recruiter"), createJob);
// placement cell can approve/reject
router.put("/:id/approve", protect, authorize("placement_cell"), approveJob);
router.put("/:id/reject", protect, authorize("placement_cell"), rejectJob);
router.put("/:id",    protect, authorize("recruiter"), updateJob);
router.delete("/:id", protect, authorize("recruiter"), deleteJob);
router.put("/jobs/:jobId/shortlist", async (req, res) => {
  try {
    const { studentId } = req.body;

    const job = await Job.findById(req.params.jobId);

    job.shortlistedStudents.push(studentId);

    await job.save();

    res.json({ message: "Student shortlisted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
