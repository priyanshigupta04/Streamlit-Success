const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const mentorController = require('../controllers/mentorController');

// Get all mentor assignments
router.get('/departments', authMiddleware, mentorController.getAllMentors);

// Get mentor for specific department
router.get('/department/:department', authMiddleware, mentorController.getMentorByDepartment);

// Assign mentor to department (only placement_cell can do this)
router.post('/assign', authMiddleware, authorize('placement_cell'), mentorController.assignMentor);

// Update mentor for department (only placement_cell can do this)
router.put('/department/:department', authMiddleware, authorize('placement_cell'), mentorController.updateMentor);

// Remove mentor assignment (only placement_cell can do this)
router.delete('/department/:department', authMiddleware, authorize('placement_cell'), mentorController.removeMentor);

// Get students in mentor's department (only mentor can see their own department)
router.get('/students/:department', authMiddleware, authorize('mentor'), mentorController.getDepartmentStudents);

module.exports = router;
