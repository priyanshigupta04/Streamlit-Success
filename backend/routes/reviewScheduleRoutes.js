const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const {
	getReviewSchedule,
	upsertAttendance,
	getAttendanceHistory,
} = require('../controllers/reviewScheduleController');

router.get('/', protect, authorize('internal_guide'), getReviewSchedule);
router.get('/history', protect, authorize('internal_guide'), getAttendanceHistory);
router.put('/attendance', protect, authorize('internal_guide'), upsertAttendance);

module.exports = router;
