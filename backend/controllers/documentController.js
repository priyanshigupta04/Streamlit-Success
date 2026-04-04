const DocumentRequest = require("../models/DocumentRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const DepartmentMentor = require("../models/DepartmentMentor");
const { generateNoc, validateNocRequirements, getNocPreview, generateLor, generateBonafide } = require('../services/documentGenerator');
const fs = require('fs');
const path = require('path');

const buildSenderMeta = (req) => ({
  sender: {
    id: req?.user?._id || null,
    name: req?.user?.name || '',
    role: req?.user?.role || '',
  },
});

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatRequestDetailsSummary = (requestDetails = {}) => {
  const entries = Object.entries(requestDetails || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => {
      const label = key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      let displayValue = value;
      if (Array.isArray(displayValue)) {
        displayValue = displayValue.join(', ');
      } else if (displayValue instanceof Date) {
        displayValue = displayValue.toLocaleDateString();
      } else if (typeof displayValue === 'object') {
        displayValue = JSON.stringify(displayValue);
      }

      return `${label}: ${displayValue}`;
    });

  return entries.join(' | ');
};

const resolveMentorUserId = async (student) => {
  if (student?.mentorId) {
    return student.mentorId;
  }

  if (student?.department) {
    const deptRegex = new RegExp(`^${String(student.department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const assignment = await DepartmentMentor.findOne({ department: deptRegex }).select('mentorId').lean();
    if (assignment?.mentorId) {
      return assignment.mentorId;
    }

    const mentorByDept = await User.findOne({ role: 'mentor', department: deptRegex }).select('_id').lean();
    if (mentorByDept?._id) {
      return mentorByDept._id;
    }
  }

  return null;
};

const buildDocumentNotification = (type, studentName, requestDetails = {}) => {
  const documentLabel = {
    noc: 'NOC Request',
    bonafide: 'Bonafide Request',
    custom: 'LOR Request',
  }[type] || 'Document Request';

  const targetName = requestDetails?.orgName || requestDetails?.applyingFor || 'document details';
  const detailsSummary = formatRequestDetailsSummary(requestDetails);
  const message = type === 'noc'
    ? `${studentName || 'A student'} submitted a NOC request for ${requestDetails?.orgName || 'an organization'} (${requestDetails?.role || 'role not specified'}). ${detailsSummary ? `Details: ${detailsSummary}` : ''}`
    : `${studentName || 'A student'} submitted a ${documentLabel.toLowerCase()} for ${targetName}. ${detailsSummary ? `Details: ${detailsSummary}` : ''}`;

  return { documentLabel, message };
};

// POST /api/documents/request — student requests a document
exports.requestDocument = async (req, res) => {
  try {
    const { type, reason, jobId, requestDetails = {} } = req.body;
    const student = await User.findById(req.user._id).select('name email department mentorId').lean();

    const doc = await DocumentRequest.create({
      studentId: req.user._id,
      type,
      reason,
      requestDetails,
      jobId: jobId || null,
      mentorApproval:  { status: 'pending' },
      hodApproval:     { status: 'pending' },
      deanApproval:    { status: 'pending' },
      overallStatus: 'pending',
    });

    const mentorUserId = await resolveMentorUserId(student);
    const { documentLabel, message } = buildDocumentNotification(type, student?.name || 'A student', requestDetails);
    const recipients = [];

    if (mentorUserId) {
      recipients.push({ userId: mentorUserId.toString(), link: '/mentor-dashboard' });
    } else {
      const mentors = await User.find({ role: 'mentor' }).select('_id').lean();
      mentors.forEach((mentor) => recipients.push({ userId: mentor._id.toString(), link: '/mentor-dashboard' }));
    }

    const approvers = await User.find({ role: { $in: ['hod', 'dean'] } }).select('_id role').lean();
    approvers.forEach((approver) => {
      recipients.push({
        userId: approver._id.toString(),
        link: approver.role === 'dean' ? '/dean-dashboard' : '/hod-dashboard',
      });
    });

    const uniqueRecipients = new Map();
    recipients.forEach((recipient) => {
      if (!uniqueRecipients.has(recipient.userId)) {
        uniqueRecipients.set(recipient.userId, recipient.link);
      }
    });

    try {
      for (const [recipientId, link] of uniqueRecipients.entries()) {
        await Notification.send(
          recipientId,
          'document_status',
          documentLabel,
          message,
          link,
          { sender: { id: req.user?._id || null, name: student?.name || '', role: 'student' } }
        );
      }
    } catch (notifyErr) {
      // Request should succeed even if notification dispatch fails.
      console.error('Notification dispatch failed for document request:', notifyErr.message);
    }

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
      // Show all pending document requests to mentors so request flow never gets blocked by mapping issues.
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

      // ===== GENERATE PDF IF DEAN APPROVES =====
      console.log('\n' + '='.repeat(60));
      console.log('🎯 DEAN APPROVAL - STARTING PDF GENERATION');
      console.log('='.repeat(60));
      
      if (doc.type === 'noc') {
        try {
          console.log('📋 [Dean] Document type: NOC');
          console.log('👤 [Dean] Student ID:', doc.studentId);
          console.log('💼 [Dean] Job ID:', doc.jobId);
          
          const validation = await validateNocRequirements(doc.studentId, doc.jobId, doc.requestDetails || {}, doc.reason || '');
          console.log('✅ [Dean] Validation result:', validation.valid);
          
          if (validation.valid) {
            console.log('🚀 [Dean] Starting PDF generation...');
            const result = await generateNoc(doc.studentId, doc.jobId, doc.requestDetails || {}, doc.reason || '');
            
            console.log('📊 [Dean] Generation result:', {
              success: result.success,
              error: result.error,
              pdfUrl: result.pdfUrl ? 'URL SET ✅' : 'URL NULL ❌'
            });
            
            if (result.success) {
              doc.generatedDocUrl = result.pdfUrl;
              doc.generatedAt = result.generatedAt;
              doc.documentVersion = 1;
              console.log('💾 [Dean] Document URL saved:', doc.generatedDocUrl);
              
              // Save student metadata
              const student = await User.findById(doc.studentId);
              doc.metadata = {
                studentName: student.name,
                enrollmentNo: student.enrollmentNo,
                branch: student.branch,
                year: student.year,
                dateOfGeneration: new Date(),
              };
              console.log('📝 [Dean] Metadata saved');
            } else {
              console.error('❌ [Dean] PDF Generation failed:', result.error);
            }
          } else {
            console.warn('⚠️ [Dean] Validation failed:', validation.errors);
          }
        } catch (pdfError) {
          console.error('💥 [Dean] Exception during PDF generation:');
          console.error('   Error:', pdfError.message);
          console.error('   Stack:', pdfError.stack);
        }

      } else if (doc.type === 'bonafide') {
        try {
          console.log('📋 [Dean] Document type: Bonafide');
          // Extract purpose from the reason field stored at request time
          const purpose = doc.reason || 'General Purpose';
          const result = await generateBonafide(doc.studentId, { purpose });
          if (result.success) {
            doc.generatedDocUrl = result.pdfUrl;
            doc.generatedAt = result.generatedAt;
            doc.documentVersion = 1;
            const student = await User.findById(doc.studentId);
            doc.metadata = {
              studentName: student.name,
              enrollmentNo: student.enrollmentNo,
              branch: student.branch,
              year: student.year,
              dateOfGeneration: new Date(),
            };
            console.log('💾 [Dean] Bonafide URL saved:', doc.generatedDocUrl);
          } else {
            console.error('❌ [Dean] Bonafide PDF failed:', result.error);
          }
        } catch (pdfError) {
          console.error('💥 [Dean] Exception during Bonafide generation:', pdfError.message);
        }

      } else if (doc.type === 'custom') {
        // LOR (custom type)
        try {
          console.log('📋 [Dean] Document type: LOR (custom)');
          // reason is stored as e.g. "LOR for Higher Studies"
          const applyingFor = doc.reason ? doc.reason.replace(/^LOR for /i, '') : 'Higher Studies';
          const result = await generateLor(doc.studentId, { applyingFor });
          if (result.success) {
            doc.generatedDocUrl = result.pdfUrl;
            doc.generatedAt = result.generatedAt;
            doc.documentVersion = 1;
            const student = await User.findById(doc.studentId);
            doc.metadata = {
              studentName: student.name,
              enrollmentNo: student.enrollmentNo,
              branch: student.branch,
              year: student.year,
              dateOfGeneration: new Date(),
            };
            console.log('💾 [Dean] LOR URL saved:', doc.generatedDocUrl);
          } else {
            console.error('❌ [Dean] LOR PDF failed:', result.error);
          }
        } catch (pdfError) {
          console.error('💥 [Dean] Exception during LOR generation:', pdfError.message);
        }

      } else {
        console.log('⏭️ [Dean] Document type is not handled for PDF generation:', doc.type);
      }
      
      console.log('='.repeat(60));
      console.log('✅ DEAN APPROVAL PROCESSING COMPLETE');
      console.log('='.repeat(60) + '\n');
      // ===== END PDF GENERATION =====
    }

    await doc.save();

    // Create notification message
    const msgs = {
      approved: `Your ${doc.type} request was approved by ${role.toUpperCase()}.`,
      rejected: `Your ${doc.type} request was rejected by ${role.toUpperCase()}. ${note ? `Reason: ${note}` : ''}`,
    };
    
    const message = msgs[decision] || `Your ${doc.type} request status updated to: ${decision}`;
    
    if (message && doc.studentId) {
      await Notification.send(doc.studentId, 'document_status',
        'Document Update', message, '/student-dashboard', buildSenderMeta(req));
    }

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

// GET /api/documents/analytics/dean - dean/hod analytics overview
exports.getDeanAnalytics = async (req, res) => {
  try {
    const [approved, rejected, pending, deptBreakdown, processedDocs] = await Promise.all([
      DocumentRequest.countDocuments({ 'deanApproval.status': 'approved' }),
      DocumentRequest.countDocuments({ 'deanApproval.status': 'rejected' }),
      DocumentRequest.countDocuments({ overallStatus: 'hod_approved' }),
      DocumentRequest.aggregate([
        {
          $match: {
            $or: [
              { overallStatus: 'hod_approved' },
              { 'deanApproval.status': { $in: ['approved', 'rejected'] } },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student',
          },
        },
        {
          $unwind: {
            path: '$student',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$student.department', 'Unknown'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      DocumentRequest.find({ 'deanApproval.status': { $in: ['approved', 'rejected'] } })
        .select('createdAt deanApproval.at')
        .lean(),
    ]);

    const totalApprovals = approved + rejected;

    const avgTurnaroundTime = processedDocs.length
      ? processedDocs.reduce((acc, doc) => {
          const decidedAt = doc?.deanApproval?.at ? new Date(doc.deanApproval.at) : null;
          const createdAt = doc?.createdAt ? new Date(doc.createdAt) : null;
          if (!decidedAt || !createdAt) return acc;
          const diffDays = (decidedAt - createdAt) / (1000 * 60 * 60 * 24);
          return acc + (diffDays > 0 ? diffDays : 0);
        }, 0) / processedDocs.length
      : 0;

    res.json({
      totalApprovals,
      approved,
      rejected,
      pending,
      avgTurnaroundTime: Number(avgTurnaroundTime.toFixed(1)),
      deptBreakdown: deptBreakdown.map((item) => ({
        department: item._id || 'Unknown',
        count: item.count || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== NOC SPECIFIC ENDPOINTS =====

// GET /api/documents/noc/preview — Get NOC template preview
exports.getNocPreview = async (req, res) => {
  try {
    const html = getNocPreview();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/documents/noc/validate — Validate NOC requirements
exports.validateNoc = async (req, res) => {
  try {
    const { studentId, jobId } = req.body;

    if (!studentId || !jobId) {
      return res.status(400).json({
        message: 'studentId and jobId are required',
      });
    }

    const validation = await validateNocRequirements(studentId, jobId);
    
    res.json({
      valid: validation.valid,
      errors: validation.errors,
      message: validation.valid ? 'NOC can be requested' : 'Missing required data',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/documents/:id/regenerate — Regenerate PDF if needed
exports.regenerateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentRequest.findById(id);

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    
    if (doc.overallStatus !== 'issued') {
      return res.status(400).json({
        message: 'Can only regenerate issued documents',
      });
    }

    if (doc.type === 'noc') {
      const result = await generateNoc(doc.studentId, doc.jobId);

      if (result.success) {
        doc.generatedDocUrl = result.pdfUrl;
        doc.generatedAt = result.generatedAt;
        doc.documentVersion = (doc.documentVersion || 1) + 1;
        await doc.save();

        res.json({
          success: true,
          message: 'Document regenerated successfully',
          document: doc,
        });
      } else {
        res.status(500).json({
          message: 'Failed to regenerate document',
          error: result.error,
        });
      }
    } else {
      res.status(400).json({
        message: 'Regeneration not supported for this document type',
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/documents/download/:studentId/:fileName — download PDF from local storage
exports.downloadDocument = async (req, res) => {
  try {
    const { studentId, fileName } = req.params;
    const decodedFileName = decodeURIComponent(fileName || '');
    
    // Security: Verify student can only download their own documents
    if (req.user._id.toString() !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to download this document' });
    }
    
    const studentBasePath = path.resolve(__dirname, '../uploads/documents', studentId);
    let filePath = path.resolve(studentBasePath, decodedFileName);

    // Security: Prevent directory traversal attacks
    if (!(filePath === studentBasePath || filePath.startsWith(studentBasePath + path.sep))) {
      return res.status(400).json({ message: 'Invalid file path' });
    }

    // If file is missing but the request is issued, regenerate on demand.
    if (!fs.existsSync(filePath)) {
      const targetFile = path.basename(decodedFileName);
      const doc = await DocumentRequest.findOne({
        studentId,
        overallStatus: 'issued',
        generatedDocUrl: { $regex: `${escapeRegex(targetFile)}$` },
      }).sort({ generatedAt: -1, createdAt: -1 });

      if (doc) {
        let regenResult = null;
        if (doc.type === 'noc') {
          regenResult = await generateNoc(doc.studentId, doc.jobId, doc.requestDetails || {}, doc.reason || '');
        } else if (doc.type === 'bonafide') {
          regenResult = await generateBonafide(doc.studentId, { purpose: doc.reason || 'General Purpose' });
        } else if (doc.type === 'custom') {
          const applyingFor = doc.reason ? doc.reason.replace(/^LOR for /i, '') : 'Higher Studies';
          regenResult = await generateLor(doc.studentId, { applyingFor });
        }

        if (regenResult?.success && regenResult.pdfUrl) {
          doc.generatedDocUrl = regenResult.pdfUrl;
          doc.generatedAt = regenResult.generatedAt || new Date();
          doc.documentVersion = (doc.documentVersion || 0) + 1;
          await doc.save();

          const marker = `/api/documents/download/${studentId}/`;
          const idx = String(regenResult.pdfUrl).indexOf(marker);
          if (idx !== -1) {
            const regeneratedName = decodeURIComponent(String(regenResult.pdfUrl).slice(idx + marker.length));
            filePath = path.resolve(studentBasePath, regeneratedName);
          }
        }
      }
    }

    // Check again after possible regeneration
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`📥 [Download] ${req.user.name || req.user.email} downloading: ${decodedFileName}`);
    
    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('❌ [Download] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/documents/:id - Delete single document request
exports.deleteDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await DocumentRequest.findById(id);
    if (!doc) {
      return res.status(404).json({ message: 'Document request not found' });
    }

    const canDeleteAny = ['placement_cell', 'admin'].includes(req.user?.role);
    const isOwner = String(doc.studentId) === String(req.user?._id);
    if (!canDeleteAny && !isOwner) {
      return res.status(403).json({ message: 'Not authorized to delete this document request' });
    }

    await doc.deleteOne();
    return res.json({ message: 'Document request deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
