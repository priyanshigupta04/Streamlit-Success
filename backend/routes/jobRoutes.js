const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createJob, getJobs, getJob, updateJob, deleteJob, getMyJobs,
  getPendingJobs, approveJob, rejectJob,
} = require("../controllers/jobController");

// list public jobs (students see only approved)
router.get("/",       protect, getJobs);
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

module.exports = router;
