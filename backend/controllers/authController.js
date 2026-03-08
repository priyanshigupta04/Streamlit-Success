const User = require("../models/User");
const DepartmentMentor = require('../models/DepartmentMentor');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Valid roles enum
const VALID_ROLES = ['student','recruiter','mentor','internal_guide','placement_cell','hod','dean'];

// ================= REGISTER =================
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // 0. Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Save user to MongoDB
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // If user is a mentor make sure they are assigned to a department
    let department;
    if (user.role === 'mentor') {
      const assignment = await DepartmentMentor.findOne({ mentorId: user._id });
      if (!assignment) {
        // prevent unassigned mentors (including other faculty) from logging in as mentor
        return res.status(403).json({ message: 'Mentor account not linked to any department. Contact admin.' });
      }
      department = assignment.department;
      // keep user.department in sync
      if (!user.department || user.department !== department) {
        user.department = department;
        await user.save();
      }
    }

    // 3. Generate JWT token with optional department
    const payload = { id: user._id, role: user.role };
    if (department) payload.department = department;
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: department || user.department
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login };
