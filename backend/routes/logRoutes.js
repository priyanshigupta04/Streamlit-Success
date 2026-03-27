const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  createLog, getMyLogs, getStudentLogs, reviewLog,
} = require("../controllers/logController");

router.post("/",              protect, authorize("student"), createLog);
router.get("/mine",           protect, authorize("student"), getMyLogs);
router.get("/students",       protect, authorize("internal_guide"), getStudentLogs);
router.get("/student/:studentId", protect, authorize("internal_guide"), getStudentLogs);
router.put("/:id/review",    protect, authorize("internal_guide"), reviewLog);

module.exports = router;
