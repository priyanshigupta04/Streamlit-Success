const jwt = require("jsonwebtoken");
const User = require("../models/User");
const DepartmentMentor = require('../models/DepartmentMentor');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized" });
      }

      // mentors must be assigned to a department or they cannot use protected areas
      if (req.user.role === 'mentor') {
        const assignment = await DepartmentMentor.findOne({ mentorId: req.user._id });
        if (!assignment) {
          return res.status(403).json({ message: 'Mentor not linked to a department' });
        }
        // attach department to request for convenience
        req.user.department = assignment.department;
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    return res.status(401).json({ message: "No token" });
  }
};

module.exports = protect;
