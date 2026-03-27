const dotenv = require("dotenv");
const mongoose = require("mongoose");

const connectDB = require("../config/db");
require("../models/User");
require("../models/Job");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const DepartmentMentor = require("../models/DepartmentMentor");

dotenv.config();

function buildInterviewMeta(app) {
  const date = app?.interview?.date ? new Date(app.interview.date).toLocaleDateString("en-IN") : null;
  const time = app?.interview?.time || null;
  const mode = app?.interview?.mode || null;
  return [date, time, mode].filter(Boolean).join(" | ");
}

async function ensureNotification({ userId, type, title, message, link }) {
  const existing = await Notification.findOne({ userId, type, title, message, link }).select("_id");
  if (existing) {
    return false;
  }

  await Notification.send(userId, type, title, message, link);
  return true;
}

async function backfill() {
  await connectDB();

  const apps = await Application.find({
    $or: [
      { interviewScheduled: true },
      { "interview.date": { $exists: true, $ne: null } },
    ],
  })
    .populate("studentId", "_id department")
    .populate("jobId", "title company")
    .lean();

  let createdStudent = 0;
  let createdMentor = 0;

  const departmentCounts = new Map();

  for (const app of apps) {
    const studentId = app?.studentId?._id;
    if (!studentId) continue;

    const roleText = app?.jobId?.title || app?.jobTitle || "Job";
    const companyText = app?.jobId?.company || app?.company || "Company";
    const interviewMeta = buildInterviewMeta(app);
    const studentMessage = `Your interview for ${roleText} at ${companyText} is scheduled${interviewMeta ? ` (${interviewMeta})` : ""}.`;

    const studentCreated = await ensureNotification({
      userId: studentId,
      type: "interview_scheduled",
      title: "Interview Scheduled",
      message: studentMessage,
      link: "/student/dashboard",
    });

    if (studentCreated) createdStudent += 1;

    const dept = app?.studentId?.department;
    if (dept) {
      departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
    }
  }

  const departments = [...departmentCounts.keys()];
  if (departments.length) {
    const mentorAssignments = await DepartmentMentor.find({ department: { $in: departments } })
      .select("mentorId department")
      .lean();

    for (const assignment of mentorAssignments) {
      if (!assignment?.mentorId) continue;
      const count = departmentCounts.get(assignment.department) || 0;
      const mentorMessage = `${count} interview(s) are already scheduled for students in ${assignment.department}.`;

      const mentorCreated = await ensureNotification({
        userId: assignment.mentorId,
        type: "interview_scheduled",
        title: "Students Interview Scheduled",
        message: mentorMessage,
        link: "/mentor/dashboard",
      });

      if (mentorCreated) createdMentor += 1;
    }
  }

  console.log("Backfill completed");
  console.log("Total interview applications scanned:", apps.length);
  console.log("Student notifications created:", createdStudent);
  console.log("Mentor notifications created:", createdMentor);
}

backfill()
  .catch((err) => {
    console.error("Backfill failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
