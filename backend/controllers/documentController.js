const DocumentRequest = require("../models/DocumentRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { generateNoc, validateNocRequirements, getNocPreview } = require("../services/documentGenerator");
const fs = require('fs');
const path = require('path');

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

      // ===== GENERATE PDF IF DEAN APPROVES =====
      console.log('\n' + '='.repeat(60));
      console.log('🎯 DEAN APPROVAL - STARTING PDF GENERATION');
      console.log('='.repeat(60));
      
      if (doc.type === 'noc') {
        try {
          console.log('📋 [Dean] Document type: NOC');
          console.log('👤 [Dean] Student ID:', doc.studentId);
          console.log('💼 [Dean] Job ID:', doc.jobId);
          
          const validation = await validateNocRequirements(doc.studentId, doc.jobId);
          console.log('✅ [Dean] Validation result:', validation.valid);
          
          if (validation.valid) {
            console.log('🚀 [Dean] Starting PDF generation...');
            const result = await generateNoc(doc.studentId, doc.jobId);
            
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
      } else {
        console.log('⏭️ [Dean] Document type is not NOC, skipping PDF generation');
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
        'Document Update', message, '/student-dashboard');
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
    
    // Security: Verify student can only download their own documents
    if (req.user._id.toString() !== studentId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to download this document' });
    }
    
    const filePath = path.join(__dirname, `../uploads/documents/${studentId}/${fileName}`);
    
    // Security: Prevent directory traversal attacks
    if (!filePath.startsWith(path.join(__dirname, '../uploads/documents'))) {
      return res.status(400).json({ message: 'Invalid file path' });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log(`📥 [Download] ${req.user.name || req.user.email} downloading: ${fileName}`);
    
    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('❌ [Download] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
