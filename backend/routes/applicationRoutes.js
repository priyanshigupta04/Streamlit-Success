const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const Application = require("../models/Application");
const {
  applyToJob, getMyApplications, getApplicants, updateApplicationStatus,
  getAllApplications, quickApply, mentorApproveApplication, mentorRejectApplication
} = require("../controllers/applicationController");

router.post("/quick",        protect, authorize("student"),                          quickApply);
router.post("/:jobId/apply", protect, authorize("student"),                          applyToJob);
router.post("/",             protect, authorize("student"),                          applyToJob);
router.get("/mine", protect, async (req,res)=>{
  
  const applications = await Application
  .find({ studentId:req.user._id })
  .populate("jobId","title company location stipend")
  .sort({createdAt:-1})

  res.json({ applications })

}),
router.get("/all",           protect, authorize("mentor", "placement_cell", "hod", "dean"), getAllApplications);
router.get("/job/:jobId",    protect, authorize("recruiter"),                        getApplicants)
router.put("/:id/mentor-approve", protect, authorize("mentor"),                      mentorApproveApplication);
router.put("/:id/mentor-reject",  protect, authorize("mentor"),                      mentorRejectApplication);
router.put("/:id/status",    protect, authorize("recruiter"),                        updateApplicationStatus);
router.put("/schedule-interview/:jobId", async (req, res) => {
  try {

    const { date, time, mode, meetingLink, location } = req.body;
    const jobId = req.params.jobId;

    const applications = await Application.updateMany(
      { jobId: jobId, status: "interview" },
      {
        status: "interview_scheduled",
        interview: {
          date,
          time,
          mode,
          meetingLink,
          location
        }
      }
    );

    res.json({
      message: "Interview scheduled for selected students",
      applications
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
