const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const htmlPdf = require('html-pdf');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

/**
 * NOC Document Generator Service
 * Handles creation of No Objection Certificate from templates
 */

// Get institution details from env
const INSTITUTION_CONFIG = {
  institutionName: process.env.INSTITUTION_NAME || 'Your Institution Name',
  institutionAddress: process.env.INSTITUTION_ADDRESS || 'Address, City, State',
  institutionPhone: process.env.INSTITUTION_PHONE || '+91-XXXX-XXXX',
  institutionEmail: process.env.INSTITUTION_EMAIL || 'contact@institution.edu',
};

const parseNocRequestDetails = (reason = '', requestDetails = {}) => {
  const parsed = { ...requestDetails };

  if (!parsed.orgName || !parsed.role) {
    const match = String(reason || '').match(/^NOC for\s+(.+?)\s+-\s+(.+?)\s+role\s*$/i);
    if (match) {
      if (!parsed.orgName) parsed.orgName = match[1].trim();
      if (!parsed.role) parsed.role = match[2].trim();
    }
  }

  if (!parsed.mode) {
    parsed.mode = 'In-Office';
  }

  return parsed;
};

const getCompiledTemplate = () => {
  try {
    const templatePath = path.join(__dirname, '../templates/noc.hbs');
    console.log('📄 [Template] Loading from:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at ${templatePath}`);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    console.log(`📄 [Template] Loaded ${templateContent.length} bytes`);
    
    const compiled = handlebars.compile(templateContent);
    console.log('📄 [Template] Compiled successfully');
    
    return compiled;
  } catch (error) {
    console.error('💥 [Template] Compilation Error:', error.message);
    throw new Error(`Template Error: ${error.message}`);
  }
};

/**
 * Fetch all required data for NOC generation
 * @param {ObjectId} studentId - Student's MongoDB ID
 * @param {ObjectId} jobId - Job's MongoDB ID
 * @param {Object} requestDetails - Saved request form data when no job exists
 * @returns {Promise<Object>} Student, job, and company data
 */
const fetchNocData = async (studentId, jobId, requestDetails = {}, reason = '') => {
  try {
    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');

    const normalizedRequest = parseNocRequestDetails(reason, requestDetails);

    let jobData = null;
    if (jobId) {
      jobData = await Job.findById(jobId).select('title company location stipend');
    }

    if (!jobData && normalizedRequest?.orgName) {
      jobData = {
        company: normalizedRequest.orgName,
        title: normalizedRequest.role || 'Internship',
        location: normalizedRequest.mode || normalizedRequest.startDate || 'Location not specified',
        stipend: normalizedRequest.duration || normalizedRequest.applyingFor || 'As per company policy',
      };
    }

    if (!jobData) {
      throw new Error('NOC request details are incomplete. Cannot generate PDF without organization information.');
    }

    return {
      student,
      jobData,
    };
  } catch (error) {
    throw new Error(`Data Fetch Error: ${error.message}`);
  }
};

/**
 * Format data for template rendering
 * @param {Object} student - Student document from DB
 * @param {Object} jobData - Job document or request-derived data
 * @returns {Object} Formatted data for Handlebars
 */
const formatDataForTemplate = (student, jobData) => {
  const today = new Date();
  const issueDate = today.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate academic year
  const year = student.year || 4;
  const graduationYear = parseInt(student.graduationYear) || new Date().getFullYear();
  const admissionYear = parseInt(student.admissionYear) || graduationYear - 4;
  const academicYear = `${admissionYear}-${admissionYear + 1}`;

  return {
    // Institution details
    ...INSTITUTION_CONFIG,

    // Student details
    studentName: student.name || 'Student Name',
    enrollmentNo: student.enrollmentNo || 'N/A',
    branch: student.branch || student.department || 'Department',
    academicYear: academicYear,
    cgpa: student.cgpa || 'N/A',

    // Job/Company details
    companyName: jobData.company || 'Company Name',
    jobTitle: jobData.title || 'Position',
    jobLocation: jobData.location || 'Location',
    stipend: jobData.stipend || 'Negotiable',

    // Document details
    internshipType: 'Internship/Placement', // Can be parameterized
    issueDate: issueDate,
    generatedDate: issueDate,
    documentId: `${student._id.toString().slice(-8).toUpperCase()}`,
    validityPeriod: '1 year',

    // Mentor & Dean names (placeholder - will be updated when approvers sign)
    mentorName: student.mentorId ? student.mentorId.toString() : 'Mentor Name',
    deanName: 'Dean/Director Name',

    // Optional fields
    expectedJoiningDate: jobData.joiningDate || null,
  };
};

/**
 * Generate HTML from template
 * @param {Object} data - Data to merge with template
 * @returns {String} HTML string
 */
const generateHtml = (data) => {
  try {
    console.log('🎨 [HTML Gen] Compiling template...');
    const template = getCompiledTemplate();
    
    console.log('🎨 [HTML Gen] Rendering with data:', Object.keys(data));
    const html = template(data);
    
    console.log(`🎨 [HTML Gen] Generated ${html.length} bytes`);
    
    if (html.length < 500) {
      console.warn('⚠️  [HTML Gen] Generated HTML is very small - might be empty template');
    }
    
    return html;
  } catch (error) {
    console.error('💥 [HTML Gen] Error:', error.message);
    throw error;
  }
};

/**
 * Convert HTML to PDF using html-pdf
 * @param {String} html - HTML content
 * @param {String} fileName - Output file name
 * @returns {Promise<Buffer>} PDF buffer
 */
const htmlToPdf = (html, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      const options = {
        format: 'A4',
        orientation: 'portrait',
        border: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        footer: {
          height: '0.5in',
        },
        timeout: 30000,
      };

      console.log(`📥 [PDF Conv] Converting HTML (${html.length} bytes) to PDF...`);
      
      htmlPdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          console.error(`❌ [PDF Conv] Error:`, err.message);
          reject(new Error(`PDF Generation Error: ${err.message}`));
        } else {
          console.log(`✅ [PDF Conv] PDF created successfully (${buffer.length} bytes)`);
          resolve(buffer);
        }
      });
    } catch (error) {
      console.error(`💥 [PDF Conv] Exception:`, error.message);
      reject(error);
    }
  });
};

/**
 * Upload PDF to Cloudinary with LOCAL FALLBACK
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} fileName - File name
 * @param {String} studentId - Student ID for folder organization
 * @returns {Promise<String>} Cloudinary/Local URL
 */
const uploadToCloudinary = async (pdfBuffer, fileName, studentId) => {
  // Always use local storage (simpler and more reliable)
  return saveToLocal(pdfBuffer, fileName, studentId);
};

/**
 * Save PDF locally and return backend URL
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {String} fileName - File name
 * @param {String} studentId - Student ID for folder organization
 * @returns {Promise<String>} Backend URL to access PDF
 */
const saveToLocal = async (pdfBuffer, fileName, studentId) => {
  try {
    console.log(`💾 [Local Storage] Saving ${fileName} for student ${studentId}`);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/documents');
    const studentDir = path.join(uploadsDir, studentId.toString());
    
    // Ensure directories exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`📁 [Local] Created: ${uploadsDir}`);
    }
    
    if (!fs.existsSync(studentDir)) {
      fs.mkdirSync(studentDir, { recursive: true });
      console.log(`📁 [Local] Created: ${studentDir}`);
    }
    
    // Save file
    const filePath = path.join(studentDir, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`✅ [Local] Saved at: ${filePath} (${pdfBuffer.length} bytes)`);
    
    // Return backend URL
    const backendUrl = `/api/documents/download/${studentId}/${fileName}`;
    console.log(`📎 [Local] Download URL: ${backendUrl}`);
    
    return backendUrl;
  } catch (error) {
    console.error(`❌ [Local Storage] Failed:`, error.message);
    console.error(error.stack);
    throw new Error(`Local storage error: ${error.message}`);
  }
};

/**
 * Main NOC Generation Function
 * @param {ObjectId} studentId - Student's MongoDB ID
 * @param {ObjectId} jobId - Job's MongoDB ID
 * @param {Object} requestDetails - Saved request details fallback
 * @returns {Promise<Object>} { pdfUrl, documentId, generatedAt }
 */
exports.generateNoc = async (studentId, jobId, requestDetails = {}, reason = '') => {
  try {
    console.log('📄 [NOC Gen] Starting for student:', studentId, 'job:', jobId);
    
    // Step 1: Fetch data
    const { student, jobData } = await fetchNocData(studentId, jobId, requestDetails, reason);
    console.log('📄 [NOC Gen] Data fetched - Student:', student.name, 'Company:', jobData.company);

    // Step 2: Format data
    const templateData = formatDataForTemplate(student, jobData);
    console.log('📄 [NOC Gen] Data formatted, Document ID:', templateData.documentId);

    // Step 3: Generate HTML
    const html = generateHtml(templateData);
    console.log('📄 [NOC Gen] HTML generated, length:', html.length);

    // Step 4: Convert to PDF
    const fileName = `NOC_${student.enrollmentNo}_${Date.now()}.pdf`;
    const pdfBuffer = await htmlToPdf(html, fileName);
    console.log('📄 [NOC Gen] PDF created, buffer size:', pdfBuffer.length);

    // Step 5: Upload to Cloudinary
    const pdfUrl = await uploadToCloudinary(pdfBuffer, fileName, studentId);
    console.log('📄 [NOC Gen] Uploaded to Cloudinary:', pdfUrl);

    // Step 6: Return result
    return {
      success: true,
      pdfUrl,
      documentId: templateData.documentId,
      generatedAt: new Date(),
      message: 'NOC generated successfully',
    };
  } catch (error) {
    console.error('💥 [NOC Gen] Error:', error.message, '\n', error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Validate if student can generate NOC
 * @param {ObjectId} studentId - Student's MongoDB ID
 * @param {ObjectId} jobId - Job's MongoDB ID
 * @param {Object} requestDetails - Saved request details fallback
 * @returns {Promise<Object>} Validation result
 */
exports.validateNocRequirements = async (studentId, jobId, requestDetails = {}, reason = '') => {
  try {
    console.log('🔍 [Validate] Checking NOC requirements...');
    console.log('   StudentID:', studentId);
    console.log('   JobID:', jobId);
    
    const student = await User.findById(studentId);
    const normalizedRequest = parseNocRequestDetails(reason, requestDetails);
    let job = null;
    if (jobId) {
      job = await Job.findById(jobId);
    }

    const errors = [];

    if (!student) {
      console.warn('⚠️ [Validate] Student not found');
      errors.push('Student not found');
    } else {
      console.log('✅ [Validate] Student found:', student.name);
      if (!student.enrollmentNo) {
        console.warn('⚠️ [Validate] Missing: enrollmentNo');
        errors.push('Student enrollment number missing');
      }
      if (!student.branch) {
        console.warn('⚠️ [Validate] Missing: branch/department');
        errors.push('Student branch/department missing');
      }
    }
    
    if (!job && !normalizedRequest?.orgName) {
      console.warn('⚠️ [Validate] Job/request details not found');
      errors.push('Organization details missing');
    } else {
      const companyName = job?.company || normalizedRequest?.orgName;
      const jobTitle = job?.title || normalizedRequest?.role;
      const location = job?.location || normalizedRequest?.mode || normalizedRequest?.startDate || 'N/A';
      console.log('✅ [Validate] NOC source found:', companyName, jobTitle, location);
      if (!companyName) {
        errors.push('Company name missing');
      }
      if (!jobTitle) {
        errors.push('Job title missing');
      }
    }

    if (job) {
      console.log('✅ [Validate] Job found:', job.title, 'at', job.company);
      if (!job.company) {
        console.warn('⚠️ [Validate] Missing: company name');
        errors.push('Company name missing');
      }
      if (!job.title) {
        console.warn('⚠️ [Validate] Missing: job title');
        errors.push('Job title missing');
      }
    }

    const result = {
      valid: errors.length === 0,
      errors,
    };
    
    console.log('📋 [Validate] Result:', result.valid ? '✅ VALID' : '❌ INVALID', `(${errors.length} errors)`);
    if (errors.length > 0) {
      console.log('   Errors:', errors);
    }
    
    return result;
  } catch (error) {
    console.error('💥 [Validate] Exception:', error.message);
    return {
      valid: false,
      errors: [error.message],
    };
  }
};

/**
 * Get NOC template preview
 * @returns {String} HTML of empty template
 */
exports.getNocPreview = () => {
  const sampleData = {
    ...INSTITUTION_CONFIG,
    studentName: 'Sample Student',
    enrollmentNo: 'ENG-2021-001',
    branch: 'Computer Science & Engineering',
    academicYear: '2021-2025',
    cgpa: '8.5',
    companyName: 'Tech Company Inc.',
    jobTitle: 'Software Engineer',
    jobLocation: 'Bangalore, India',
    stipend: '₹ 6,00,000 LPA',
    internshipType: 'Internship',
    issueDate: new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    generatedDate: new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    documentId: 'SAMPLE01',
    validityPeriod: '1 year',
    mentorName: 'Dr. Mentor Name',
    deanName: 'Dr. Dean Name',
  };

  return generateHtml(sampleData);
};

// ─────────────────────────────────────────────────────────────
//  LOR GENERATOR
// ─────────────────────────────────────────────────────────────

const getLorTemplate = () => {
  const templatePath = path.join(__dirname, '../templates/lor.hbs');
  if (!fs.existsSync(templatePath)) throw new Error(`LOR template not found at ${templatePath}`);
  return handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
};

/**
 * Generate LOR PDF
 * @param {ObjectId} studentId
 * @param {Object}   extraData  — { applyingFor, targetUniversity, achievements }
 *                               stored in doc.reason/metadata at request time
 */
exports.generateLor = async (studentId, extraData = {}) => {
  try {
    console.log('📄 [LOR Gen] Starting for student:', studentId);

    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');

    const today = new Date();
    const issueDate = today.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const graduationYear = parseInt(student.graduationYear) || new Date().getFullYear();
    const admissionYear  = parseInt(student.admissionYear)  || graduationYear - 4;

    const templateData = {
      ...INSTITUTION_CONFIG,
      studentName:    student.name || 'Student Name',
      enrollmentNo:   student.enrollmentNo || 'N/A',
      branch:         student.branch || student.department || 'Department',
      academicYear:   `${admissionYear}-${admissionYear + 1}`,
      cgpa:           student.cgpa || 'N/A',
      applyingFor:    extraData.applyingFor    || 'Higher Studies / Employment',
      targetUniversity: extraData.targetUniversity || '',
      achievements:   extraData.achievements   || '',
      issueDate,
      generatedDate:  issueDate,
      documentId:     student._id.toString().slice(-8).toUpperCase(),
      hodName:        'Head of Department',
      deanName:       'Dean / Director',
    };

    console.log('📄 [LOR Gen] Rendering template...');
    const html = getLorTemplate()(templateData);

    const fileName  = `LOR_${student.enrollmentNo || student._id}_${Date.now()}.pdf`;
    const pdfBuffer = await htmlToPdf(html, fileName);
    const pdfUrl    = await saveToLocal(pdfBuffer, fileName, studentId);

    console.log('📄 [LOR Gen] Done:', pdfUrl);
    return { success: true, pdfUrl, generatedAt: new Date() };
  } catch (error) {
    console.error('💥 [LOR Gen] Error:', error.message);
    return { success: false, error: error.message };
  }
};

// ─────────────────────────────────────────────────────────────
//  BONAFIDE GENERATOR
// ─────────────────────────────────────────────────────────────

const getBonafideTemplate = () => {
  const templatePath = path.join(__dirname, '../templates/bonafide.hbs');
  if (!fs.existsSync(templatePath)) throw new Error(`Bonafide template not found at ${templatePath}`);
  return handlebars.compile(fs.readFileSync(templatePath, 'utf8'));
};

/**
 * Generate Bonafide Certificate PDF
 * @param {ObjectId} studentId
 * @param {Object}   extraData  — { purpose }
 */
exports.generateBonafide = async (studentId, extraData = {}) => {
  try {
    console.log('📄 [Bonafide Gen] Starting for student:', studentId);

    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');

    const today = new Date();
    const issueDate = today.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const graduationYear = parseInt(student.graduationYear) || new Date().getFullYear();
    const admissionYear  = parseInt(student.admissionYear)  || graduationYear - 4;

    const templateData = {
      ...INSTITUTION_CONFIG,
      studentName:  student.name || 'Student Name',
      enrollmentNo: student.enrollmentNo || 'N/A',
      branch:       student.branch || student.department || 'Department',
      academicYear: `${admissionYear}-${admissionYear + 1}`,
      cgpa:         student.cgpa || 'N/A',
      purpose:      extraData.purpose || 'General Purpose',
      issueDate,
      generatedDate: issueDate,
      documentId:   student._id.toString().slice(-8).toUpperCase(),
      hodName:      'Head of Department',
      deanName:     'Dean / Director',
    };

    console.log('📄 [Bonafide Gen] Rendering template...');
    const html = getBonafideTemplate()(templateData);

    const fileName  = `BON_${student.enrollmentNo || student._id}_${Date.now()}.pdf`;
    const pdfBuffer = await htmlToPdf(html, fileName);
    const pdfUrl    = await saveToLocal(pdfBuffer, fileName, studentId);

    console.log('📄 [Bonafide Gen] Done:', pdfUrl);
    return { success: true, pdfUrl, generatedAt: new Date() };
  } catch (error) {
    console.error('💥 [Bonafide Gen] Error:', error.message);
    return { success: false, error: error.message };
  }
};

