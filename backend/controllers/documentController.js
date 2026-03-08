const DocumentRequest = require("../models/DocumentRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");

// POST /api/documents/request — student requests a document
exports.requestDocument = async (req, res) => {
  try {
    const { type, reason, jobId } = req.body;

    const doc = await DocumentRequest.create({
      studentId: req.user._id,
      type, reason, jobId: jobId || null,
      mentorApproval:  { status: 'pending' },
      hodApproval:     { status: 'pending' },
      deanApproval:    { status: 'pending' },
      overallStatus: 'pending',
    });

    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/documents/mine — student's documents
exports.getMyDocuments = async (req, res) => {
  try {
    const docs = await DocumentRequest.find({ studentId: req.user._id })
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 });
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/documents/pending — pending for approver's role
exports.getPendingDocuments = async (req, res) => {
  try {
    const role = req.user.role;
    let filter = {};

    if (role === 'mentor') {
      filter.overallStatus = 'pending';
      // additional restriction: only show documents belonging to the mentor's department
      if (req.user.department) {
        // find students in that department
        const students = await User.find({ department: req.user.department, role: 'student' }).select('_id');
        const ids = students.map(s => s._id);
        filter.studentId = { $in: ids };
      }
    } else if (role === 'hod') {
      filter.overallStatus = 'mentor_approved';
    } else if (role === 'dean') {
      filter.overallStatus = 'hod_approved';
    } else if (role === 'placement_cell') {
      // Placement cell can see all
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const docs = await DocumentRequest.find(filter)
      .populate('studentId', 'name email branch department')
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 });

    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/documents/:id/approve — 3-level approval
exports.approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body; // 'approved' | 'rejected'
    const role = req.user.role;

    const doc = await DocumentRequest.findById(id);
    if (!doc) return res.status(404).json({ message: 'Request not found' });

    // Enforce chain ordering
    if (role === 'hod' && doc.mentorApproval.status !== 'approved')
      return res.status(400).json({ message: 'Mentor approval required first' });
    if (role === 'dean' && doc.hodApproval.status !== 'approved')
      return res.status(400).json({ message: 'HOD approval required first' });

    const approvalMap = { mentor: 'mentorApproval', hod: 'hodApproval', dean: 'deanApproval' };
    const approvalField = approvalMap[role];
    if (!approvalField) return res.status(403).json({ message: 'Not authorized to approve' });

    doc[approvalField] = { status: decision, by: req.user._id, note: note || '', at: new Date() };

    // Advance overall status
    if (decision === 'rejected') {
      doc.overallStatus = 'rejected';
    } else if (role === 'mentor') {
      doc.overallStatus = 'mentor_approved';
    } else if (role === 'hod') {
      doc.overallStatus = 'hod_approved';
    } else if (role === 'dean') {
      doc.overallStatus = 'issued';
    }

    await doc.save();

    const msgs = {
      approved: `Your ${doc.type} request was approved by ${role.toUpperCase()}.`,
      rejected: `Your ${doc.type} request was rejected by ${role.toUpperCase()}. Reason: ${note}`,
    };
    await Notification.send(doc.studentId, 'document_status',
      'Document Update', msgs[decision], '/student-dashboard');

    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/documents/all — placement cell sees everything
exports.getAllDocuments = async (req, res) => {
  try {
    const docs = await DocumentRequest.find()
      .populate('studentId', 'name email branch department')
      .populate('jobId', 'title company')
      .sort({ createdAt: -1 });
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
