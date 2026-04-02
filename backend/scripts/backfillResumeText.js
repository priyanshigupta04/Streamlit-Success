require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User');

const DEFAULT_AI_SERVICE_URL = 'https://streamlit-success-ai.onrender.com';
const AI_BASE = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const students = await User.find({
    role: 'student',
    resumeUrl: { $exists: true, $ne: '' },
    $or: [{ resumeText: { $exists: false } }, { resumeText: '' }],
  }).select('_id name email resumeUrl resumeText skills github linkedin cgpa branch');

  console.log(`Found ${students.length} students to backfill resumeText`);

  let success = 0;
  let failed = 0;

  for (const s of students) {
    try {
      const response = await axios.post(
        `${AI_BASE}/parse-resume-url`,
        { resume_url: s.resumeUrl },
        { timeout: 30000 }
      );

      const fields = response.data?.fields || {};
      const parsedText = String(fields.resumeText || '').trim();
      if (parsedText.length < 20) {
        failed += 1;
        console.log(`- Skipped ${s.email}: parsed text too short`);
        continue;
      }

      const updates = { resumeText: parsedText };
      if (Array.isArray(fields.skills) && fields.skills.length) updates.skills = fields.skills.join(', ');
      if (fields.github && !s.github) updates.github = fields.github;
      if (fields.linkedin && !s.linkedin) updates.linkedin = fields.linkedin;
      if (fields.cgpa && !s.cgpa) updates.cgpa = fields.cgpa;
      if (fields.branch && !s.branch) updates.branch = fields.branch;

      await User.findByIdAndUpdate(s._id, updates, { new: false });
      success += 1;
      console.log(`+ Backfilled ${s.email}`);
    } catch (err) {
      failed += 1;
      const msg = err?.response?.data?.detail || err.message;
      console.log(`! Failed ${s.email}: ${msg}`);
    }
  }

  console.log(`Done. Success=${success}, Failed=${failed}`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
