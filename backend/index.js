const express = require("express");
const dotenv = require("dotenv");
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

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
