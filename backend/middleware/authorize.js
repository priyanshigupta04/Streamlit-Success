/**
 * Role-based authorization middleware.
 * Use after `protect` (auth) middleware.
 * Example: router.post('/jobs', protect, authorize('recruiter','placement_cell'), createJob);
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role '${req.user.role}' is not authorized for this action`
    });
  }
  next();
};

module.exports = authorize;
