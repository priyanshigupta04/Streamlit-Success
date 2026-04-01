const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const ROLES = require("../constants/roles");
const {
  getMyNotifications, markAsRead, markAllAsRead, deleteOne, deleteSelected, deleteFiltered, broadcast,
} = require("../controllers/notificationController");

router.get("/mine",         protect, getMyNotifications);
router.put("/read-all",    protect, markAllAsRead);
router.delete("/bulk-delete", protect, deleteSelected);
router.delete("/clear",     protect, deleteFiltered);
router.put("/:id/read",    protect, markAsRead);
router.delete("/:id",      protect, deleteOne);
router.post("/broadcast",  protect, authorize(ROLES.PLACEMENT_CELL), broadcast);

module.exports = router;
