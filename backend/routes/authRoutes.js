const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");

router.post("/register", register);
router.post("/login", login);

// GET /api/auth/me — rehydrate user from JWT on page refresh
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const response = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    if (user.role === 'mentor' && user.department) {
      response.department = user.department;
    }
    res.json({ user: response });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
