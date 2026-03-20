const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const DepartmentMentor = require("../models/DepartmentMentor");
const {
  applyToJob, getMyApplications, getApplicants, updateApplicationStatus,
  getAllApplications, quickApply, mentorApproveApplication, mentorRejectApplication,
  getMyScheduledInterviews
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
router.get("/scheduled/mine", protect, authorize("recruiter", "placement_cell"),    getMyScheduledInterviews);
router.put("/:id/mentor-approve", protect, authorize("mentor"),                      mentorApproveApplication);
router.put("/:id/mentor-reject",  protect, authorize("mentor"),                      mentorRejectApplication);
router.put("/:id/status",    protect, authorize("recruiter"),                        updateApplicationStatus);
router.put("/:id/cancel-interview", protect, authorize("recruiter", "placement_cell"), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate("studentId", "_id name department")
      .populate("jobId", "title company postedBy");

    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.jobId?.postedBy && req.user.role !== "placement_cell") {
      if (app.jobId.postedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const wasScheduled = app.interviewScheduled || app.interview?.date || app.status === "interview_scheduled";
    if (!wasScheduled) {
      return res.status(400).json({ message: "Interview is not scheduled for this application" });
    }

    await Application.updateOne(
      { _id: app._id },
      {
        $set: {
          status: "interview",
          interviewScheduled: false,
          interviewScheduledBy: null,
        },
        $unset: {
          interview: "",
        },
      }
    );

    const roleText = app.jobId?.title || app.jobTitle || "the position";
    const companyText = app.jobId?.company || app.company || "the company";

    if (app.studentId?._id) {
      await Notification.send(
        app.studentId._id,
        "interview_scheduled",
        "Interview Cancelled",
        `Your interview for ${roleText} at ${companyText} has been cancelled. Recruiter will share updated schedule if rescheduled.`,
        "/student/dashboard"
      );
    }

    const dept = app.studentId?.department;
    if (dept) {
      const mentorAssignments = await DepartmentMentor.find({ department: dept }).select("mentorId");
      const mentorNotifications = mentorAssignments
        .filter((assignment) => assignment.mentorId)
        .map((assignment) =>
          Notification.send(
            assignment.mentorId,
            "interview_scheduled",
            "Student Interview Cancelled",
            `An interview has been cancelled for a student in ${dept} (${roleText} at ${companyText}).`,
            "/mentor/dashboard"
          )
        );
      await Promise.all(mentorNotifications);
    }

    res.json({ message: "Interview cancelled successfully", application: app });
  } catch (error) {
    console.error('cancel-interview error:', error.message);
    res.status(500).json({ message: "Failed to cancel interview", error: error.message });
  }
});
router.put("/:id/reschedule-interview", protect, authorize("recruiter", "placement_cell"), async (req, res) => {
  try {
    const { date, time, mode, meetingLink, location } = req.body;

    const app = await Application.findById(req.params.id)
      .populate("studentId", "_id name department")
      .populate("jobId", "title company postedBy");

    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.jobId?.postedBy && req.user.role !== "placement_cell") {
      if (app.jobId.postedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    app.status = "interview_scheduled";
    app.interviewScheduled = true;
    app.interviewScheduledBy = req.user._id;
    app.interview = {
      date,
      time,
      mode,
      meetingLink: meetingLink || "",
      location: location || "",
    };
    await app.save();

    const roleText = app.jobId?.title || app.jobTitle || "the position";
    const companyText = app.jobId?.company || app.company || "the company";
    const interviewMeta = [date, time, mode].filter(Boolean).join(" | ");

    if (app.studentId?._id) {
      await Notification.send(
        app.studentId._id,
        "interview_scheduled",
        "Interview Rescheduled",
        `Your interview for ${roleText} at ${companyText} has been rescheduled${interviewMeta ? ` (${interviewMeta})` : ""}.`,
        "/student/dashboard"
      );
    }

    const dept = app.studentId?.department;
    if (dept) {
      const mentorAssignments = await DepartmentMentor.find({ department: dept }).select("mentorId");
      const mentorNotifications = mentorAssignments
        .filter((assignment) => assignment.mentorId)
        .map((assignment) =>
          Notification.send(
            assignment.mentorId,
            "interview_scheduled",
            "Student Interview Rescheduled",
            `An interview has been rescheduled for a student in ${dept} (${roleText} at ${companyText})${interviewMeta ? ` (${interviewMeta})` : ""}.`,
            "/mentor/dashboard"
          )
        );
      await Promise.all(mentorNotifications);
    }

    res.json({ message: "Interview rescheduled successfully", application: app });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
router.put("/schedule-interview/:jobId", protect, authorize("recruiter", "placement_cell"), async (req, res) => {
  try {

    const { date, time, mode, meetingLink, location } = req.body;
    const jobId = req.params.jobId;

    // Fetch targeted applications before update to notify exact users.
    const targetApplications = await Application.find({ jobId, status: "interview" })
      .populate("studentId", "_id department")
      .populate("jobId", "title company");

    if (!targetApplications.length) {
      return res.status(404).json({ message: "No interview-ready applications found for this job" });
    }

    const applicationIds = targetApplications.map((app) => app._id);

    const applications = await Application.updateMany(
      { _id: { $in: applicationIds } },
      {
        status: "interview_scheduled",
        interviewScheduled: true,
        interviewScheduledBy: req.user?._id,
        interview: {
          date,
          time,
          mode,
          meetingLink,
          location
        }
      }
    );

    const interviewMeta = [date, time, mode].filter(Boolean).join(" | ");

    // Notify students whose interviews were scheduled.
    const studentNotifications = targetApplications
      .filter((app) => app.studentId?._id)
      .map((app) => {
        const roleText = app.jobId?.title || "Job";
        const companyText = app.jobId?.company || "Company";
        return Notification.send(
          app.studentId._id,
          "interview_scheduled",
          "Interview Scheduled",
          `Your interview for ${roleText} at ${companyText} is scheduled${interviewMeta ? ` (${interviewMeta})` : ""}.`,
          "/student/dashboard"
        );
      });

    // Notify mentors of impacted departments once per department.
    const impactedDepartments = [
      ...new Set(
        targetApplications
          .map((app) => app.studentId?.department)
          .filter(Boolean)
      ),
    ];

    const mentorAssignments = await DepartmentMentor.find({ department: { $in: impactedDepartments } })
      .select("mentorId department");

    const mentorNotifications = mentorAssignments
      .filter((assignment) => assignment.mentorId)
      .map((assignment) =>
        Notification.send(
          assignment.mentorId,
          "interview_scheduled",
          "Students Interview Scheduled",
          `Interviews have been scheduled for students in ${assignment.department}${interviewMeta ? ` (${interviewMeta})` : ""}.`,
          "/mentor/dashboard"
        )
      );

    await Promise.all([...studentNotifications, ...mentorNotifications]);

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
