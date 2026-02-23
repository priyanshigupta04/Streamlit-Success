const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  applyToJob, getMyApplications, getApplicants, updateApplicationStatus,
  getAllApplications, quickApply, mentorApproveApplication,
} = require("../controllers/applicationController");

router.post("/quick",        protect, authorize("student"),                          quickApply);
router.post("/",             protect, authorize("student"),                          applyToJob);
router.get("/mine",          protect, authorize("student"),                          getMyApplications);
router.get("/all",           protect, authorize("mentor", "placement_cell", "hod", "dean"), getAllApplications);
router.get("/job/:jobId",    protect, authorize("recruiter"),                        getApplicants);
router.put("/:id/mentor-approve", protect, authorize("mentor"),                      mentorApproveApplication);
router.put("/:id/status",    protect, authorize("recruiter"),                        updateApplicationStatus);

module.exports = router;
