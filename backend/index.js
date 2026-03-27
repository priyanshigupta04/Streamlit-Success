const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./config/db");
const cors = require("cors");

// Route imports
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const logRoutes = require("./routes/logRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const mentorRoutes = require("./routes/mentorRoutes");
const internshipFormRoutes = require("./routes/internshipFormRoutes");
const reviewScheduleRoutes = require("./routes/reviewScheduleRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Debug endpoint - check database state
app.get("/api/debug/notification-state", async (req, res) => {
  try {
    const User = require('./models/User');
    const placementCellCount = await User.countDocuments({ role: 'placement_cell' });
    const mentorCount = await User.countDocuments({ role: 'mentor' });
    const studentCount = await User.countDocuments({ role: 'student' });
    
    const studentsWithMentor = await User.countDocuments({ 
      role: 'student',
      mentorId: { $exists: true, $ne: null }
    });
    
    const placementCellUsers = await User.find({ role: 'placement_cell' })
      .select('_id name email department')
      .lean();
    
    const studentSample = await User.find({ role: 'student' })
      .select('_id name email department mentorId')
      .limit(5)
      .lean();

    const mentorsByDept = await User.find({ role: 'mentor' })
      .select('_id name email department')
      .lean();

    res.json({
      counts: {
        placementCell: placementCellCount,
        mentors: mentorCount,
        students: studentCount,
        studentsWithMentor
      },
      placementCellUsers,
      studentSample,
      mentorsByDept,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Setup endpoint - assign mentors to students by department
app.post("/api/debug/setup-mentors", async (req, res) => {
  try {
    const User = require('./models/User');
    
    // Get all students without mentorId
    const students = await User.find({ 
      role: 'student',
      $or: [
        { mentorId: { $exists: false } },
        { mentorId: null }
      ]
    });

    console.log(`🔧 Setting up mentors for ${students.length} students`);

    let updated = 0;
    for (const student of students) {
      // Find a mentor in the same department
      const mentor = await User.findOne({ 
        role: 'mentor',
        department: student.department
      });

      if (mentor) {
        await User.findByIdAndUpdate(student._id, { mentorId: mentor._id });
        updated++;
        console.log(`✅ Assigned mentor ${mentor.name} to student ${student.name} (dept: ${student.department})`);
      } else {
        console.warn(`⚠️ No mentor found for department: ${student.department}, student: ${student.name}`);
      }
    }

    res.json({
      message: `Updated ${updated} / ${students.length} students with mentorId`,
      updated,
      total: students.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint - check offer letters stored in database
app.get("/api/debug/offer-letters", async (req, res) => {
  try {
    const User = require('./models/User');
    
    const studentsWithOffers = await User.find({ 
      offerLetterUrl: { $exists: true, $ne: null }
    }).select('_id name email department offerLetterName offerLetterUrl offerLetterHash mentorId').lean();

    const studentsByMentor = {};
    for (const student of studentsWithOffers) {
      const mentor = await User.findById(student.mentorId).select('name email _id').lean();
      if (!studentsByMentor[student.mentorId]) {
        studentsByMentor[student.mentorId] = {
          mentor: mentor,
          students: []
        };
      }
      studentsByMentor[student.mentorId].students.push({
        name: student.name,
        email: student.email,
        fileName: student.offerLetterName,
        url: student.offerLetterUrl?.substring(0, 60) + '...',
        hash: student.offerLetterHash?.substring(0, 8)
      });
    }

    res.json({
      count: studentsWithOffers.length,
      byMentor: studentsByMentor,
      allStudents: studentsWithOffers.map(s => ({
        name: s.name,
        email: s.email,
        fileName: s.offerLetterName,
        urlSample: s.offerLetterUrl?.substring(0, 80),
        hash: s.offerLetterHash?.substring(0, 8)
      })),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint - check notifications for a mentor
app.get("/api/debug/mentor-notifications/:mentorId", async (req, res) => {
  try {
    const Notification = require('./models/Notification');
    const User = require('./models/User');
    
    const { mentorId } = req.params;
    const mentor = await User.findById(mentorId).select('name email role department').lean();
    
    const notifications = await Notification.find({ userId: mentorId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    const offerNotifications = notifications.filter(n => n.type === 'offer_received');

    res.json({
      mentor,
      totalNotifications: notifications.length,
      offerLetterNotifications: offerNotifications.length,
      lastNotifications: notifications,
      allOfferNotifications: offerNotifications,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint - TEST notification creation
app.post("/api/debug/test-notification/:userId", async (req, res) => {
  try {
    const Notification = require('./models/Notification');
    const User = require('./models/User');
    
    const { userId } = req.params;
    const user = await User.findById(userId).select('name email').lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', userId });
    }

    console.log('🧪 [TEST NOTIF] Creating test notification for:', user);
    
    const testNotif = await Notification.send(
      userId,
      'offer_received',
      'TEST: Offer Letter Uploaded',
      'This is a test notification to verify the system is working.',
      '/mentor-dashboard'
    );

    console.log('✅ [TEST NOTIF] Successfully created:', testNotif);

    res.json({
      message: 'Test notification created successfully',
      notification: testNotif,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('❌ [TEST NOTIF] FAILED:', err);
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/internship-forms", internshipFormRoutes);
app.use("/api/review-schedule", reviewScheduleRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
