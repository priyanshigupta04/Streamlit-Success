const InternshipForm = require("../models/InternshipForm");
const User = require("../models/User");
const Notification = require("../models/Notification");

// @desc    Submit internship form
// @route   POST /api/internship-forms
// @access  Private (Student only)
const submitForm = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: "Only students can submit this form" });
    }

    if (req.user.semester !== 8) {
       return res.status(403).json({ message: "Only 8th-semester students can submit this form" });
    }

    const { companyName, role, stipend, companyAddress, joiningDate, internshipPeriod, extraDetails } = req.body;

    const newForm = new InternshipForm({
      student: req.user._id,
      department: req.user.department || 'Unknown',
      mentor: req.user.mentorId, // Attach the student's mentor
      companyName,
      role,
      stipend,
      companyAddress,
      joiningDate,
      internshipPeriod,
      extraDetails
    });

    const savedForm = await newForm.save();

    const studentName = req.user.name || 'A student';

    if (req.user.mentorId) {
      await Notification.send(
        req.user.mentorId,
        'announcement',
        'New Internship Form Submitted',
        `${studentName} submitted an internship form for ${companyName} (${role}). Please review it from Mentor Dashboard.`,
        '/mentor-dashboard'
      );
    }

    const placementUsers = await User.find({ role: 'placement_cell' }).select('_id').lean();
    if (placementUsers.length) {
      const placementNotifications = placementUsers.map((u) => ({
        userId: u._id,
        type: 'announcement',
        title: 'New Internship Form Submitted',
        message: `${studentName} submitted an internship form for ${companyName} (${role}).`,
        link: '/placement-cell-dashboard'
      }));
      await Notification.insertMany(placementNotifications);
    }

    res.status(201).json(savedForm);
  } catch (error) {
    console.error("Submit Form Error:", error);
    res.status(500).json({ message: "Failed to submit form", error: error.message });
  }
};

// @desc    Get internship forms based on role
// @route   GET /api/internship-forms
// @access  Private
const getForms = async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const forms = await InternshipForm.find({ student: req.user._id })
        .populate('internalGuide', 'name email')
        .populate('mentor', 'name email');
      return res.json(forms);
    } 
    
    if (req.user.role === 'mentor') {
      // Find forms where the form's department matches the mentor's department
      // Use case-insensitive regex for department matching to prevent typos (SOCSET vs SOSCET)
      // or at least be forgiving about capitalization
      const deptRegex = new RegExp(`^${req.user.department}$`, 'i');
      
      const forms = await InternshipForm.find({
        $or: [
          { department: deptRegex },
          { mentor: req.user._id }
        ]
      })
        .populate('student', 'name email branch enrollmentNo department offerLetterName offerLetterUrl offerLetterHash')
        .populate('internalGuide', 'name email');
      return res.json(forms);
    }
    
    if (req.user.role === 'admin' || req.user.role === 'placement_cell') {
       const forms = await InternshipForm.find()
        .populate('student', 'name email branch')
        .populate('mentor', 'name')
        .populate('internalGuide', 'name');
       return res.json(forms);
    }

    if (req.user.role === 'internal_guide') {
      const forms = await InternshipForm.find({ internalGuide: req.user._id })
        .populate('student', 'name email branch enrollmentNo department')
        .populate('mentor', 'name email');
      return res.json(forms);
    }

    res.status(403).json({ message: "Not authorized to view forms" });
  } catch (error) {
    console.error("Get Forms Error:", error);
    res.status(500).json({ message: "Failed to fetch forms", error: error.message });
  }
};

// @desc    Approve form and assign internal guide
// @route   PUT /api/internship-forms/:id/approve
// @access  Private (Mentor only)
const approveForm = async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ message: "Only mentors can approve forms" });
    }

    const { internalGuideId } = req.body; // Guide ID passed from frontend

    const form = await InternshipForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const isAssignedMentor = form.mentor && form.mentor.toString() === req.user._id.toString();
    const isSameDepartment = form.department && req.user.department && 
      form.department.toLowerCase() === req.user.department.toLowerCase();

    // To gracefully handle the SOSCET/SOCSET typo directly in approvals as well
    const isTypoMatch = (form.department?.toUpperCase() === 'SOSCET' && req.user.department?.toUpperCase() === 'SOCSET') ||
                        (form.department?.toUpperCase() === 'SOCSET' && req.user.department?.toUpperCase() === 'SOSCET');

    if (!isAssignedMentor && !isSameDepartment && !isTypoMatch) {
       return res.status(403).json({ message: "Not authorized to approve this form" });
    }

    form.status = 'approved';
    if (internalGuideId) {
      form.internalGuide = internalGuideId;
      
      // Also update the Student's guideId
      await User.findByIdAndUpdate(form.student, { guideId: internalGuideId });
    }

    await form.save();
    
    const updatedForm = await InternshipForm.findById(form._id)
      .populate('student', 'name email branch enrollmentNo')
      .populate('internalGuide', 'name email');

    // Notify student that mentor approved form and assigned internal guide.
    if (updatedForm?.student?._id) {
      const guideName = updatedForm?.internalGuide?.name || 'an internal guide';
      const guideEmail = updatedForm?.internalGuide?.email || '';
      const guideInfo = guideEmail ? `${guideName} (${guideEmail})` : guideName;

      await Notification.send(
        updatedForm.student._id,
        'announcement',
        'Internal Guide Assigned',
        `Your internship form for ${updatedForm.companyName} (${updatedForm.role}) was approved. Internal guide assigned: ${guideInfo}.`,
        '/student-dashboard'
      );
    }

    // Optional: also notify internal guide so both sides are informed.
    if (updatedForm?.internalGuide?._id) {
      const studentName = updatedForm?.student?.name || 'A student';
      await Notification.send(
        updatedForm.internalGuide._id,
        'announcement',
        'New Student Assigned',
        `${studentName} has been assigned to you as internal-guide for internship monitoring.`,
        '/internal-guide-dashboard'
      );
    }

    res.json(updatedForm);
  } catch (error) {
    console.error("Approve Form Error:", error);
    res.status(500).json({ message: "Failed to approve form", error: error.message });
  }
};

// @desc    Get all internal guides for dropdown assignment
// @route   GET /api/internship-forms/guides
// @access  Private (Mentor only)
const getGuides = async (req, res) => {
  try {
    if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Not authorized" });
    }
    const guides = await User.find({ role: 'internal_guide' }).select('name email department');
    res.json(guides);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch guides", error: error.message });
  }
};

module.exports = { submitForm, getForms, approveForm, getGuides };
