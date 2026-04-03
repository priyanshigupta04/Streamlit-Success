const express = require("express");
const router = express.Router();
const axios = require("axios");
const protect = require("../middleware/authMiddleware");

const DEFAULT_AI_SERVICE_URL = "https://streamlit-success-ai.onrender.com";
const AI_BASE = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
const AI_HEALTH_TIMEOUT_MS = Math.min(Number(process.env.AI_HEALTH_TIMEOUT_MS || 20000), 5000);

// POST /api/ai/analyze — proxy resume analysis to Python FastAPI
router.post("/analyze", protect, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ message: "resumeText is required" });

    const response = await axios.post(`${AI_BASE}/analyze`, { resume_text: resumeText }, { timeout: 30000 });
    res.json(response.data);
  } catch (err) {
    console.error("AI analyze error:", err.message);
    res.status(502).json({ message: "AI service unavailable", error: err.message });
  }
});

// POST /api/ai/recommend — get job recommendations for student
router.post("/recommend", protect, async (req, res) => {
  try {
    const { resumeText, jobs } = req.body;
    if (!resumeText || !jobs) return res.status(400).json({ message: "resumeText and jobs are required" });

    const response = await axios.post(`${AI_BASE}/recommend`, { resume_text: resumeText, jobs }, { timeout: 30000 });
    res.json(response.data);
  } catch (err) {
    console.error("AI recommend error:", err.message);
    res.status(502).json({ message: "AI service unavailable", error: err.message });
  }
});

// POST /api/ai/skills — extract skills from text
router.post("/skills", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });

    const response = await axios.post(`${AI_BASE}/skills`, { text }, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    console.error("AI skills error:", err.message);
    res.status(502).json({ message: "AI service unavailable", error: err.message });
  }
});

// GET /api/ai/health — AI service health check
router.get("/health", async (req, res) => {
  try {
    const response = await axios.get(`${AI_BASE}/health`, { timeout: AI_HEALTH_TIMEOUT_MS });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ status: "down", error: err.message });
  }
});

module.exports = router;
