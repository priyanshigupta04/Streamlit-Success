const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  getAllUsers, updateUserRole, deleteUser, getStats, assignMentorToStudent,
} = require("../controllers/adminController");

router.get("/users",           protect, authorize("placement_cell"), getAllUsers);
router.put("/users/:id/role",  protect, authorize("placement_cell"), updateUserRole);
router.delete("/users/:id",    protect, authorize("placement_cell"), deleteUser);
router.get("/stats",           protect, authorize("placement_cell"), getStats);
router.put("/students/:studentId/assign-mentor", protect, authorize("placement_cell"), assignMentorToStudent);

module.exports = router;
