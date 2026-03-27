# 🎓 Automated NOC Generation System - Setup & Usage

## 📋 What Was Implemented

### ✅ Completed Components

| Component | File | Status |
|-----------|------|--------|
| **NOC Template** | `backend/templates/noc.hbs` | ✓ Complete |
| **Generator Service** | `backend/services/documentGenerator.js` | ✓ Complete |
| **Controller Updates** | `backend/controllers/documentController.js` | ✓ Complete |
| **Route Endpoints** | `backend/routes/documentRoutes.js` | ✓ Complete |
| **Database Model** | `backend/models/DocumentRequest.js` | ✓ Complete |
| **Dependencies** | `backend/package.json` | ✓ Added |

---

## 🔄 NOC Generation Workflow

### Complete Flow:

```
1. Student Requests NOC
   ↓
2. Mentor Reviews & Approves
   ↓
3. HOD Reviews Mentor's Approval
   ↓
4. Dean Approves → 🔄 PDF AUTOMATICALLY GENERATED
   ├─ HTML generated from template
   ├─ HTML converted to PDF
   ├─ PDF uploaded to Cloudinary
   ├─ URL saved in database
   └─ Student notified
   ↓
5. Student Downloads PDF from Dashboard
```

---

## 📦 Key Features

✅ **Automatic Generation** - PDF auto-generates when dean approves NOC  
✅ **Template System** - Professional HTML template with Handlebars  
✅ **Auto Data-Fill** - Student & job data merged automatically  
✅ **Cloud Storage** - PDFs stored on Cloudinary  
✅ **Version Tracking** - Track document regenerations  
✅ **Metadata Snapshot** - Save student data at generation time  
✅ **Data Validation** - Check requirements before generation  
✅ **Template Preview** - View template before requesting  
✅ **Regeneration** - Re-generate PDF if data changes  
✅ **3-Level Approval** - Integrated with existing workflow  

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

**New packages added:**
- `handlebars` - Template compilation
- `html-pdf` - HTML to PDF conversion
- `pdfkit` - Direct PDF creation
- `nodemailer` - Email notifications (optional)

### Step 2: Update Environment Variables

Add to your `.env` file:

```env
# Institution Details (Required for NOC)
INSTITUTION_NAME=Your College/University Name
INSTITUTION_ADDRESS=Address, City, State - PIN
INSTITUTION_PHONE=+91-XXXX-XXXXXX
INSTITUTION_EMAIL=contact@institution.edu

# Cloudinary (Already configured)
CLOUDINARY_NAME=your_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Step 3: Restart Backend Server

```bash
npm run dev
# or
npm start
```

---

## 📡 API Endpoints

### Document Request (Existing - Updated)
```
POST /api/documents/
Authorization: Student Token
Body: {
  "type": "noc",
  "reason": "Need NOC for internship",
  "jobId": "job_object_id"
}

Response: {
  "document": {
    "_id": "doc_id",
    "type": "noc",
    "overallStatus": "pending",
    "mentorApproval": { "status": "pending" },
    "hodApproval": { "status": "pending" },
    "deanApproval": { "status": "pending" }
  }
}
```

### Approve Document (Existing - Enhanced)
```
PUT /api/documents/:id/approve
Authorization: Mentor/HOD/Dean Token
Body: {
  "decision": "approved",  // or "rejected"
  "note": "Approval comments"
}

Response: {
  "document": {
    ...document_data,
    "overallStatus": "issued",
    "generatedDocUrl": "https://cloudinary.url/...",
    "generatedAt": "2025-03-13T10:30:00Z",
    "metadata": {
      "studentName": "John Doe",
      "enrollmentNo": "ENG2021001",
      "branch": "CSE",
      "year": 4,
      "dateOfGeneration": "2025-03-13T10:30:00Z"
    }
  }
}
```

### Get My Documents (Existing - Enhanced Output)
```
GET /api/documents/mine
Authorization: Student Token

Response: {
  "documents": [
    {
      "_id": "...",
      "type": "noc",
      "overallStatus": "issued",
      "generatedDocUrl": "https://cloudinary.url/noc_file.pdf",
      "generatedAt": "2025-03-13T10:30:00Z",
      "documentVersion": 1,
      "metadata": {...}
    }
  ]
}
```

### Get NOC Preview (New)
```
GET /api/documents/noc/preview
No Authentication Required

Response: HTML content of NOC template
```

### Validate NOC Requirements (New)
```
POST /api/documents/noc/validate
Authorization: Student Token
Body: {
  "studentId": "student_id",
  "jobId": "job_id"
}

Response: {
  "valid": true,
  "errors": [],
  "message": "NOC can be requested"
}

OR if invalid:
{
  "valid": false,
  "errors": [
    "Student enrollment number missing",
    "Company name missing"
  ],
  "message": "Missing required data"
}
```

### Regenerate Document (New)
```
POST /api/documents/:id/regenerate
Authorization: Student Token

Response: {
  "success": true,
  "message": "Document regenerated successfully",
  "document": {
    ...,
    "documentVersion": 2,
    "generatedAt": "2025-03-13T11:30:00Z"
  }
}
```

---

## 📊 Data Mapping

### Template Variables Auto-Populated From:

**Student Data (User Model):**
- `name` → `studentName`
- `enrollmentNo` → `enrollmentNo`
- `branch` → `branch`
- `year` → `year`
- `cgpa` → `cgpa`
- `graduationYear` → `academicYear` (calculated)
- `mentorId` → `mentorName`

**Job Data (Job Model):**
- `company` → `companyName`
- `title` → `jobTitle`
- `location` → `jobLocation`
- `stipend` → `stipend`

**Auto-Generated:**
- Current Date → `issueDate`, `generatedDate`
- Student ID → `documentId`
- "1 year" → `validityPeriod`

---

## 🎨 Template Details

**File:** `backend/templates/noc.hbs`  
**Format:** HTML with Handlebars variables  
**Sections:**
1. Institution header with contact details
2. Student information (auto-filled)
3. Company/Job details (auto-filled)
4. Terms and conditions
5. Validity period
6. Signature blocks for mentor & dean
7. Document ID & generation timestamp

**Key Features:**
- Professional layout with proper styling
- Responsive design (prints well)
- Watermark-ready area
- Signature blocks for approvers
- Footer with document ID

---

## 🧪 Testing Checklist

### Prerequisites:
- [ ] Student has complete profile (enrollment no, branch, year, CGPA)
- [ ] Job posting created with company & title
- [ ] Student applied for the job (created Application)

### Test Flow:
1. [ ] Student requests NOC
   ```
   POST /api/documents/ with type="noc"
   ```
   
2. [ ] Validate NOC can be created
   ```
   POST /api/documents/noc/validate
   Should return: valid=true
   ```
   
3. [ ] Mentor approves
   ```
   PUT /api/documents/:id/approve with role=mentor
   Status should be: mentor_approved
   ```
   
4. [ ] HOD approves
   ```
   PUT /api/documents/:id/approve with role=hod
   Status should be: hod_approved
   ```
   
5. [ ] Dean approves (Triggers PDF generation)
   ```
   PUT /api/documents/:id/approve with role=dean
   Status should be: issued
   Should have: generatedDocUrl, generatedAt, metadata
   ```
   
6. [ ] Verify PDF in database
   ```
   GET /api/documents/mine
   Check: generatedDocUrl is populated
   ```
   
7. [ ] Download PDF from Cloudinary
   ```
   Copy generatedDocUrl to browser
   PDF should download successfully
   ```

---

## 🔧 Service Functions Reference

### `documentGenerator.js` - Main Functions:

#### `generateNoc(studentId, jobId)`
**Purpose:** Main NOC generation function  
**Returns:** `{ success, pdfUrl, documentId, generatedAt, message/error }`

#### `validateNocRequirements(studentId, jobId)`
**Purpose:** Check if student data is complete  
**Returns:** `{ valid, errors }`

#### `getNocPreview()`
**Purpose:** Get template preview HTML  
**Returns:** HTML string with sample data

#### `fetchNocData(studentId, jobId)`
**Purpose:** Fetch student & job data from DB  
**Returns:** `{ student, jobData }`

#### `formatDataForTemplate(student, jobData)`
**Purpose:** Format raw data for Handlebars  
**Returns:** Object with template variables

#### `generateHtml(data)`
**Purpose:** Merge data with template  
**Returns:** HTML string

#### `htmlToPdf(html, fileName)`
**Purpose:** Convert HTML to PDF buffer  
**Returns:** PDF buffer

#### `uploadToCloudinary(pdfBuffer, fileName, studentId)`
**Purpose:** Upload PDF to cloud  
**Returns:** Secure Cloudinary URL

---

## 📈 Database Changes

### DocumentRequest Model - New Fields:

```javascript
{
  // Existing fields...
  
  // NEW: PDF tracking
  generatedDocUrl: String,      // Cloudinary URL
  generatedAt: Date,            // Generation timestamp
  signatureUrl: String,         // Digital signature
  signedAt: Date,               // Signature timestamp
  issueDate: Date,              // Official issue date
  expiryDate: Date,             // Validity expiration
  documentVersion: Number,      // Re-generation counter
  
  // NEW: Snapshot of student data at generation
  metadata: {
    studentName: String,
    enrollmentNo: String,
    branch: String,
    year: Number,
    dateOfGeneration: Date
  }
}
```

### New Indexes Added:
- `generatedDocUrl` (for quick URL lookup)

---

## 🔜 Future Enhancements

### Phase 2 - Additional Documents:
- [ ] **Bonafide Certificate** - For ongoing students
- [ ] **Completion Certificate** - For finished internships
- [ ] **Experience Letter** - From company details

### Phase 3 - Advanced Features:
- [ ] **Digital Signatures** - Add dean's signature/watermark
- [ ] **Email Dispatch** - Send PDF to student email
- [ ] **Scheduled Generation** - Auto-generate on graduation
- [ ] **Batch Processing** - Generate for multiple students
- [ ] **PDF Annotations** - Add approvals/stamps
- [ ] **Audit Trail** - Track all modifications

---

## 📚 Important Notes

### Data Validation:
⚠️ NOC generation will **fail silently** if required data is missing:
- Student enrollment number
- Student branch
- Company name
- Job title

Use `/api/documents/noc/validate` endpoint to check before requesting.

### PDF Generation Timeout:
- Default timeout: 30 seconds
- Large documents may require adjustment
- Check logs if generation fails

### Cloudinary Storage:
- Uploaded to: `documents/noc/{studentId}/`
- Naming: `NOC_{enrollmentNo}_{timestamp}.pdf`
- Can be configured in `documentGenerator.js`

### Approval Chain:
⚠️ Must follow order: **Mentor → HOD → Dean**  
Cannot skip steps or change order.

---

## 🆘 Troubleshooting

### PDF not generating:
1. Check if Cloudinary credentials are valid
2. Verify student has enrollment number & branch
3. Verify job has company & title
4. Check backend logs for specific error

### PDF URL not in database:
1. Make sure dean actually approved (not just mentor)
2. Check if document type is "noc"
3. Verify Cloudinary upload was successful

### Template not rendering variables:
1. Check Handlebars syntax in template
2. Ensure data is being formatted correctly
3. Check for typos in variable names

---

## 📞 Support

For issues or questions:
1. Check logs: `npm run dev` output
2. Validate endpoint: POST `/api/documents/noc/validate`
3. Test template: GET `/api/documents/noc/preview`
4. Check database: Verify DocumentRequest fields

---

**Status:** Ready for Production  
**Last Updated:** March 13, 2025  
**Next Phase:** Bonafide & Completion Certificate
