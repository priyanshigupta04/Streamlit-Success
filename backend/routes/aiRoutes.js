const express = require("express");
const router = express.Router();
const axios = require("axios");
const protect = require("../middleware/authMiddleware");

const DEFAULT_AI_SERVICE_URL = "https://streamlit-success-ai.onrender.com";
const normalizeAiUrl = (url) => String(url || "").trim().replace(/\/$/, "");
const isLocalAiUrl = (url) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(url || "").trim());
const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};
const getAiBases = () => {
  const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  const primary = normalizeAiUrl(process.env.AI_SERVICE_URL || "");
  const list = String(process.env.AI_SERVICE_URLS || "")
    .split(",")
    .map(normalizeAiUrl)
    .filter(Boolean);
  const candidates = [primary, ...list, normalizeAiUrl(DEFAULT_AI_SERVICE_URL)].filter(Boolean);
  const filtered = isProduction ? candidates.filter((url) => !isLocalAiUrl(url)) : candidates;
  const unique = [...new Set((filtered.length ? filtered : candidates).filter(Boolean))];
  unique.sort((a, b) => Number(isLocalAiUrl(a)) - Number(isLocalAiUrl(b)));
  return unique;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const AI_HEALTH_TIMEOUT_MS = clamp(
  Number(process.env.AI_HEALTH_TIMEOUT_MS || 15000),
  3000,
  60000
);
const AI_REQUEST_TIMEOUT_MS = clamp(
  Number(process.env.AI_REQUEST_TIMEOUT_MS || 25000),
  10000,
  90000
);
const AI_MAX_RETRIES = clamp(Number(process.env.AI_MAX_RETRIES || 2), 0, 4);
const AI_RETRY_BASE_DELAY_MS = clamp(
  Number(process.env.AI_RETRY_BASE_DELAY_MS || 1500),
  250,
  10000
);
const AI_WAKEUP_ON_RETRY = toBool(process.env.AI_WAKEUP_ON_RETRY, true);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (err) => {
  const status = Number(err?.response?.status || 0);
  const code = String(err?.code || "").toUpperCase();

  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  if (["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENOTFOUND", "ECONNREFUSED"].includes(code)) {
    return true;
  }
  return false;
};

const summarizeError = (err) => {
  const status = err?.response?.status;
  const detail =
    err?.response?.data?.detail || err?.response?.data?.message || err?.message || "unknown error";
  return status ? `${status}: ${detail}` : String(detail);
};

let wakeupInFlight = null;

const wakeUpAiService = async () => {
  if (wakeupInFlight) return wakeupInFlight;

  wakeupInFlight = (async () => {
    try {
      await getFromAiWithFallback("/health", AI_HEALTH_TIMEOUT_MS);
    } catch (err) {
      // Best-effort wake-up probe; retries below still handle failures.
      console.warn("AI warm-up probe failed:", summarizeError(err));
    }
  })();

  try {
    await wakeupInFlight;
  } finally {
    wakeupInFlight = null;
  }
};

const postToAiWithFallback = async (path, payload, timeoutMs) => {
  const effectiveTimeout = clamp(Number(timeoutMs || AI_REQUEST_TIMEOUT_MS), 10000, 180000);
  let lastErr = null;

  for (let attempt = 0; attempt <= AI_MAX_RETRIES; attempt += 1) {
    for (const base of getAiBases()) {
      try {
        return await axios.post(`${base}${path}`, payload, { timeout: effectiveTimeout });
      } catch (err) {
        lastErr = err;
      }
    }

    if (!isRetryableError(lastErr) || attempt >= AI_MAX_RETRIES) {
      break;
    }

    if (AI_WAKEUP_ON_RETRY && attempt === 0) {
      await wakeUpAiService();
    }

    const delayMs = AI_RETRY_BASE_DELAY_MS * (attempt + 1);
    await sleep(delayMs);
  }

  throw lastErr || new Error("AI service unavailable");
};

const getFromAiWithFallback = async (path, timeoutMs) => {
  const effectiveTimeout = clamp(Number(timeoutMs || AI_HEALTH_TIMEOUT_MS), 3000, 60000);
  let lastErr = null;
  for (const base of getAiBases()) {
    try {
      return await axios.get(`${base}${path}`, { timeout: effectiveTimeout });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("AI service unavailable");
};

// POST /api/ai/analyze — proxy resume analysis to Python FastAPI
router.post("/analyze", protect, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ message: "resumeText is required" });

    const response = await postToAiWithFallback("/analyze", { resume_text: resumeText }, AI_REQUEST_TIMEOUT_MS);
    res.json(response.data);
  } catch (err) {
    console.error("AI analyze error:", summarizeError(err));
    res.status(502).json({ message: "AI service unavailable", error: summarizeError(err) });
  }
});

// POST /api/ai/recommend — get job recommendations for student
router.post("/recommend", protect, async (req, res) => {
  try {
    const { resumeText, jobs } = req.body;
    if (!resumeText || !jobs) return res.status(400).json({ message: "resumeText and jobs are required" });

    const response = await postToAiWithFallback(
      "/recommend",
      { resume_text: resumeText, jobs },
      AI_REQUEST_TIMEOUT_MS
    );
    res.json(response.data);
  } catch (err) {
    console.error("AI recommend error:", summarizeError(err));
    res.status(502).json({ message: "AI service unavailable", error: summarizeError(err) });
  }
});

// POST /api/ai/skills — extract skills from text
router.post("/skills", protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "text is required" });

    const response = await postToAiWithFallback("/skills", { text }, clamp(AI_REQUEST_TIMEOUT_MS, 10000, 45000));
    res.json(response.data);
  } catch (err) {
    console.error("AI skills error:", summarizeError(err));
    res.status(502).json({ message: "AI service unavailable", error: summarizeError(err) });
  }
});

// GET /api/ai/health — AI service health check
router.get("/health", async (req, res) => {
  try {
    const response = await getFromAiWithFallback("/health", AI_HEALTH_TIMEOUT_MS);
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ status: "down", error: summarizeError(err) });
  }
});

module.exports = router;
