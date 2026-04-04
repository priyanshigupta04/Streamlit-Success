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
  const localDefault = normalizeAiUrl("http://127.0.0.1:8000");
  const candidates = isProduction
    ? [primary, ...list, normalizeAiUrl(DEFAULT_AI_SERVICE_URL)].filter(Boolean)
    : [primary, ...list, localDefault, normalizeAiUrl(DEFAULT_AI_SERVICE_URL)].filter(Boolean);
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

const normalizeSkillList = (skillsValue) => {
  if (Array.isArray(skillsValue)) {
    return skillsValue.map((s) => String(s || '').trim()).filter(Boolean);
  }
  return String(skillsValue || '').split(',').map((s) => s.trim()).filter(Boolean);
};

const canonicalizeSkill = (skill) => {
  const raw = String(skill || '').toLowerCase().trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/\b(basic|intermediate|advanced|beginner)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const compact = cleaned.replace(/[\s._-]+/g, '');

  if (compact === 'reactjs' || cleaned === 'react js' || cleaned === 'react') return 'react';
  if (compact === 'nodejs' || cleaned === 'node js' || cleaned === 'node') return 'node.js';
  if (cleaned === 'js' || compact === 'javascript') return 'javascript';
  if (compact === 'html5' || cleaned === 'html') return 'html';
  if (compact === 'css3' || cleaned === 'css') return 'css';
  if (compact === 'nextjs' || cleaned === 'next js' || cleaned === 'next.js') return 'next.js';
  if (compact === 'angularjs' || cleaned.includes('angular')) return 'angular';

  return cleaned;
};

const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const buildDisplaySkillList = (requiredSkills, canonicalSet) => {
  const display = [];
  const seen = new Set();
  for (const skill of requiredSkills || []) {
    const canonical = canonicalizeSkill(skill);
    if (!canonical || !canonicalSet.has(canonical) || seen.has(canonical)) continue;
    seen.add(canonical);
    display.push(String(skill || '').trim() || canonical);
  }
  return display;
};

const mergeSkillSignalsIntoRankings = (rankings, jobs, profileSkills) => {
  const profileSkillSet = new Set(normalizeSkillList(profileSkills).map(canonicalizeSkill).filter(Boolean));
  if (!profileSkillSet.size) return rankings;

  const jobById = new Map((jobs || []).map((job) => [String(job?._id || job?.id || ''), job]));

  return (rankings || []).map((rank) => {
    const job = jobById.get(String(rank?.jobId || ''));
    if (!job) return rank;

    const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
    if (!requiredSkills.length) return rank;

    const normalizedRequired = requiredSkills.map(canonicalizeSkill).filter(Boolean);
    if (!normalizedRequired.length) return rank;

    const aiMatched = new Set(normalizeSkillList(rank?.matchedSkills).map(canonicalizeSkill).filter(Boolean));
    const mergedMatched = new Set(aiMatched);

    for (const required of normalizedRequired) {
      if (profileSkillSet.has(required)) mergedMatched.add(required);
    }

    const missingCanonical = normalizedRequired.filter((required) => !mergedMatched.has(required));
    const skillOverlap = clampScore((mergedMatched.size / normalizedRequired.length) * 100);
    const profileMatchBoost = Math.max(0, mergedMatched.size - aiMatched.size) * 6;
    const adjustedOverall = clampScore(Math.max(rank?.overallScore || 0, skillOverlap, (rank?.overallScore || 0) + profileMatchBoost));

    return {
      ...rank,
      overallScore: adjustedOverall,
      skillOverlap,
      matchedSkills: buildDisplaySkillList(requiredSkills, mergedMatched),
      missingSkills: buildDisplaySkillList(requiredSkills, new Set(missingCanonical)),
    };
  });
};

const mergeProfileSkillsIntoResumeText = (resumeText, profileSkills) => {
  const baseText = String(resumeText || '').trim();
  const skills = normalizeSkillList(profileSkills);

  if (!skills.length) return baseText;

  const lowerBase = baseText.toLowerCase();
  const missingSkills = skills.filter((skill) => !lowerBase.includes(skill.toLowerCase()));
  if (!missingSkills.length) return baseText;

  return `${baseText}\n\nAdditional Profile Skills: ${missingSkills.join(', ')}`;
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
    const { resumeText, jobs, profileSkills } = req.body;
    if (!resumeText || !jobs) return res.status(400).json({ message: "resumeText and jobs are required" });

    const enrichedResumeText = mergeProfileSkillsIntoResumeText(resumeText, profileSkills);

    const response = await postToAiWithFallback(
      "/recommend",
      { resume_text: enrichedResumeText, jobs },
      AI_REQUEST_TIMEOUT_MS
    );
    const rankings = Array.isArray(response.data?.rankings)
      ? mergeSkillSignalsIntoRankings(response.data.rankings, jobs, profileSkills)
      : response.data?.rankings;

    res.json({
      ...response.data,
      rankings,
    });
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
