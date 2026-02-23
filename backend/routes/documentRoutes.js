const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const {
  requestDocument, getMyDocuments, getPendingDocuments, approveDocument, getAllDocuments,
} = require("../controllers/documentController");

router.post("/",            protect, authorize("student"), requestDocument);
router.get("/mine",         protect, authorize("student"), getMyDocuments);
router.get("/pending",      protect, authorize("mentor", "hod", "dean"), getPendingDocuments);
router.put("/:id/approve",  protect, authorize("mentor", "hod", "dean"), approveDocument);
router.get("/all",          protect, authorize("placement_cell"), getAllDocuments);

module.exports = router;
