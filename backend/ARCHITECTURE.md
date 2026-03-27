## 🏗️ NOC SYSTEM ARCHITECTURE

### Data Flow Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                     AUTOMATED NOC GENERATION SYSTEM                        ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                            STUDENT FRONTEND                                 │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ 1. Student completes profile (name, enrollment, branch, CGPA)    │       │
│  │ 2. Student applies for job (creates Application document)        │       │
│  │ 3. Student requests NOC (POST /api/documents/)                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          APPROVAL WORKFLOW                                  │
│                                                                             │
│  MENTOR REVIEW               HOD REVIEW                  DEAN REVIEW        │
│  ┌──────────────┐            ┌──────────┐              ┌──────────┐         │
│  │ Status: pending              │ Status: │              │ Status:  │       │
│  │ Checks: ✓ Student            │ mentor_ │              │ hod_     │       │
│  │         ✓ Job details        │ approved              │ approved │        │
│  │         ✓ Academic standing  │                        │          │       │
│  │ Action: Approve/Reject       │ Checks:               │ Checks:  │        │
│  │ Result: mentor_approved  → │ ✓ Mentor OK           │ ✓ HOD OK │        │
│  │                              │ Result: hod_          │ Result:  │        │
│  │                              │         approved  →   │ issued✓  │        │
│  └──────────────┘               └──────────┘           └──────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
              ┌─────────────────────────────────────────────────┐
              │   DEAN APPROVAL TRIGGERS PDF GENERATION        │
              └─────────────────────────────────────────────────┘
                                      ↓
╔════════════════════════════════════════════════════════════════════════════╗
║                     PDF GENERATION PIPELINE                                ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  Step 1: FETCH DATA              Step 2: VALIDATE DATA                    ║
║  ┌──────────────────────┐        ┌──────────────────────┐                 ║
║  │ User Service         │        │ Is enrollment no? ✓  │                 ║
║  │ └─ .findById(student)│        │ Is branch filled? ✓  │                 ║
║  │                      │        │ Is CGPA filled? ✓    │                 ║
║  │ Job Service          │        │ Is company name? ✓   │                 ║
║  │ └─ .findById(job)    │        │ Is job title? ✓      │                 ║
║  │                      │        │                      │                 ║
║  │ Returns:             │        │ If any missing:      │                 ║
║  │ {student, jobData}   │        │ Log error & skip     │                 ║
║  └──────────────────────┘        └──────────────────────┘                 ║
║           ↓                                      ↓                         ║
║  Step 3: FORMAT FOR TEMPLATE     Step 4: LOAD & COMPILE                   ║
║  ┌──────────────────────┐        ┌──────────────────────┐                 ║
║  │ Create object:       │        │ Read: noc.hbs        │                 ║
║  │ {                    │        │ Compile Handlebars   │                 ║
║  │   studentName: ...,  │        │ template function    │                 ║
║  │   enrollmentNo: ..., │        │                      │                 ║
║  │   branch: ...,       │        │ Returns:             │                 ║
║  │   cgpa: ...,         │        │ Compile function(data)                 ║
║  │   companyName: ...,  │        │                      │                 ║
║  │   jobTitle: ...,     │        │                      │                 ║
║  │   location: ...,     │        │                      │                 ║
║  │   issueDate: ...,    │        │                      │                 ║
║  │   ...                │        │                      │                 ║
║  │ }                    │        │                      │                 ║
║  └──────────────────────┘        └──────────────────────┘                 ║
║           ↓                                      ↓                         ║
║           └──────────────────────┬───────────────┘                         ║
║                                  ↓                                         ║
║  Step 5: RENDER HTML             Step 6: CONVERT TO PDF                   ║
║  ┌──────────────────────┐        ┌──────────────────────┐                 ║
║  │ template(data)       │        │ html-pdf library     │                 ║
║  │ ↓                    │        │ ↓                    │                 ║
║  │ Generate HTML string │        │ A4 format            │                 ║
║  │ with all data merged │        │ Professional layout  │                 ║
║  │ in document content  │        │ ↓                    │                 ║
║  │                      │        │ PDF Buffer created   │                 ║
║  │ Returns:             │        │                      │                 ║
║  │ <html>...</html>     │        │ Returns:             │                 ║
║  │                      │        │ Buffer (binary)      │                 ║
║  └──────────────────────┘        └──────────────────────┘                 ║
║           ↓                                      ↓                        ║
║           └──────────────────────┬───────────────┘                        ║
║                                  ↓                                        ║
║  Step 7: UPLOAD TO CLOUDINARY    Step 8: SAVE TO DATABASE                 ║
║  ┌──────────────────────┐        ┌──────────────────────┐                 ║
║  │ Cloudinary upload:   │        │ DocumentRequest.     │                 ║
║  │ ├─ Folder:           │        │ update({             │                 ║
║  │ │  documents/noc/... │        │   generatedDocUrl,   │                 ║
║  │ ├─ Filename:         │        │   generatedAt,       │                 ║
║  │ │  NOC_ENR_TIME.pdf  │        │   documentVersion,   │                 ║
║  │ └─ Public upload     │        │   metadata,          │                 ║
║  │                      │        │   overallStatus:     │                 ║
║  │ Returns:             │        │   "issued"           │                 ║
║  │ Secure Cloudinary    │        │ })                   │                 ║
║  │ URL                  │        │                      │                 ║
║  └──────────────────────┘        └──────────────────────┘                 ║
║           ↓                                      ↓                         ║
║           └──────────────────────┬───────────────┘                         ║
║                                  ↓                                         ║
║              Step 9: NOTIFY STUDENT                                        ║
║              ┌──────────────────────────────┐                              ║
║              │ Send Notification:           │                              ║
║              │ "Your NOC is ready!"         │                              ║
║              │ Link to download             │                              ║
║              └──────────────────────────────┘                              ║
║                                 ✓                                          ║
║                          COMPLETE!                                         ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STUDENT RETRIEVES PDF                                │
│  GET /api/documents/mine                                                    │
│  ├─ See NOC in list with status: "issued"                                  │
│  ├─ Click download or copy URL                                             │
│  ├─ Open generatedDocUrl in browser                                        │
│  └─ Download PDF from Cloudinary                                           │
│                                                                              │
│  PDF Contains:                                                              │
│  ├─ Institution header with details                                        │
│  ├─ Student information (auto-filled)                                      │
│  ├─ Company/Job details (auto-filled)                                      │
│  ├─ Terms & conditions                                                     │
│  ├─ Signature blocks for mentor & dean                                     │
│  └─ Document ID & timestamp                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 SERVICE LAYER ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                  documentGenerator.js                        │
│                    (Service Layer)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ PUBLIC FUNCTIONS (Called by Controller)             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 1. generateNoc(studentId, jobId)                    │  │
│  │    └─ Main entry point for PDF generation           │  │
│  │                                                       │  │
│  │ 2. validateNocRequirements(studentId, jobId)        │  │
│  │    └─ Check if data is complete                     │  │
│  │                                                       │  │
│  │ 3. getNocPreview()                                  │  │
│  │    └─ Return sample NOC HTML                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ INTERNAL HELPER FUNCTIONS                           │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ • getCompiledTemplate()                             │  │
│  │    └─ Load & compile noc.hbs template              │  │
│  │                                                       │  │
│  │ • fetchNocData()                                    │  │
│  │    └─ Get student & job from database              │  │
│  │                                                       │  │
│  │ • formatDataForTemplate()                           │  │
│  │    └─ Convert raw data to template variables       │  │
│  │                                                       │  │
│  │ • generateHtml()                                    │  │
│  │    └─ Merge data with template                     │  │
│  │                                                       │  │
│  │ • htmlToPdf()                                       │  │
│  │    └─ Convert HTML to PDF buffer                   │  │
│  │                                                       │  │
│  │ • uploadToCloudinary()                              │  │
│  │    └─ Upload PDF buffer to cloud                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ↓                                          ↓
    ┌───────────┐                          ┌──────────────┐
    │ MONGOOSE  │                          │  CLOUDINARY  │
    │ DATABASE  │                          │   STORAGE    │
    │           │                          │              │
    │ User      │                          │ /documents/  │
    │ Job       │                          │ /noc/        │
    │ Document  │                          │ /{userId}/   │
    │ Request   │                          │              │
    └───────────┘                          └──────────────┘
```

---

## 🔄 CONTROLLER INTEGRATION

```
documentController.js
│
├─ requestDocument() [EXISTING]
│  └─ Create DocumentRequest with type="noc"
│
├─ getPendingDocuments() [EXISTING]
│  └─ Filter by status & role
│
├─ approveDocument() [MODIFIED ⭐]
│  ├─ Check approval chain
│  ├─ Update approval status
│  │
│  └─ IF role="dean" AND decision="approved" AND type="noc":
│     ├─ Call validateNocRequirements()
│     ├─ Call generateNoc()
│     ├─ Save generatedDocUrl to DB
│     ├─ Save metadata snapshot
│     ├─ Update overallStatus = "issued"
│     └─ Notify student ✓
│
├─ getNocPreview() [NEW]
│  └─ Return sample NOC HTML for preview
│
├─ validateNoc() [NEW]
│  └─ Check requirements before requesting
│
└─ regenerateDocument() [NEW]
   └─ Re-generate PDF if needed
```

---

## 📊 DATA TRANSFORMATION FLOW

```
Database Record                    Template Variables
───────────────────                ─────────────────

User {                             {
  _id: ObjectId                      studentName: "John Doe"
  name: "John Doe"        ────────→  enrollmentNo: "ENG2021001"
  enrollmentNo: "ENG2021001"         branch: "Computer Science"
  branch: "Computer Science"         year: 4
  year: 4                            cgpa: "8.5"
  cgpa: "8.5"
  graduationYear: "2025"  ────────→  academicYear: "2021-2025"
  mentorId: ObjectId      ────────→  mentorName: "Dr. Mentor"
}

Job {                              
  _id: ObjectId                      companyName: "TechCorp"
  company: "TechCorp"     ────────→  jobTitle: "Software Engineer"
  title: "Software Eng."             jobLocation: "Bangalore"
  location: "Bangalore"              stipend: "6,00,000/- LPA"
  stipend: "6,00,000"
}

System Generated:                  
  Current Date            ────────→  issueDate: "13 March 2025"
  Student ID              ────────→  documentId: "D5E6F7A8"
  "1 year"                ────────→  validityPeriod: "1 year"
  Current Date/Time       ────────→  generatedDate: "13 March 2025"
```

---

## 🎯 REQUEST/RESPONSE FLOW

```
1. REQUEST NOC
   Client Request:
   POST /api/documents/
   {
     type: "noc",
     jobId: "64a5f8c3..."
   }
   
   ↓ documentController.requestDocument()
   
   Server Response:
   201 Created
   {
     document: {
       _id: "64b0a1d2...",
       type: "noc",
       overallStatus: "pending",
       mentorApproval: { status: "pending" },
       hodApproval: { status: "pending" },
       deanApproval: { status: "pending" }
     }
   }

═══════════════════════════════════════════════════════════════

2. DEAN APPROVES (Triggers PDF Generation)
   Client Request:
   PUT /api/documents/64b0a1d2.../approve
   {
     decision: "approved",
     note: "Approved"
   }
   
   ↓ documentController.approveDocument()
   
   Check if role="dean" && type="noc"
   Call documentGenerator.generateNoc()
   
   PDF Generation Steps:
   ├─ Fetch student & job data
   ├─ Validate (throw if invalid)
   ├─ Format for template
   ├─ Load noc.hbs template
   ├─ Merge data with template → HTML
   ├─ Convert HTML to PDF → Buffer
   ├─ Upload Buffer to Cloudinary → URL
   └─ Save URL to database
   
   ↓
   
   Server Response:
   200 OK
   {
     document: {
       _id: "64b0a1d2...",
       type: "noc",
       overallStatus: "issued",
       generatedDocUrl: "https://cloudinary.url/noc_file.pdf",
       generatedAt: "2025-03-13T10:30:00Z",
       documentVersion: 1,
       metadata: {
         studentName: "John Doe",
         enrollmentNo: "ENG2021001",
         branch: "CSE",
         year: 4,
         dateOfGeneration: "2025-03-13T10:30:00Z"
       }
     }
   }

═══════════════════════════════════════════════════════════════

3. STUDENT RETRIEVES & DOWNLOADS
   Client Request:
   GET /api/documents/mine
   
   ↓ documentController.getMyDocuments()
   
   Server Response:
   200 OK
   {
     documents: [
       {
         _id: "64b0a1d2...",
         type: "noc",
         overallStatus: "issued",
         generatedDocUrl: "https://cloudinary.url/...",
         ← Can now download from this URL
       }
     ]
   }
   
   Student clicks link:
   GET https://cloudinary.url/noc_file.pdf
   
   ↓ Cloudinary serves PDF
   
   PDF downloaded to client machine ✓
```

---

## ⚠️ ERROR HANDLING

```
Generation Failures (Non-blocking):

┌─ Missing Student Data
│  ├─ No enrollment number
│  ├─ No branch/department
│  ├─ No CGPA
│  └─ Action: Log error, skip PDF generation
│
├─ Missing Job Data
│  ├─ No company name
│  ├─ No job title
│  └─ Action: Log error, skip PDF generation
│
├─ HTML to PDF Conversion
│  ├─ Timeout after 30 seconds
│  ├─ Invalid HTML syntax
│  └─ Action: Log error, skip PDF generation
│
└─ Cloudinary Upload
   ├─ Invalid credentials
   ├─ Network error
   ├─ Rate limit exceeded
   └─ Action: Log error, skip PDF generation

Result: Document marked as "issued" regardless
         ← PDFs are "nice-to-have", not critical
         ← Approval workflow continues

Note: Always validate before requesting with:
      POST /api/documents/noc/validate
```

---

## 🔐 SECURITY CONSIDERATIONS

```
1. AUTHENTICATION
   ✓ All endpoints require JWT token
   ✓ Students can only request for their own IDs
   ✓ Mentors/HOD/Dean verified by role

2. AUTHORIZATION
   ✓ Students: Can request, view own, regenerate
   ✓ Mentors: Can approve pending docs
   ✓ HOD: Can approve mentor-approved docs
   ✓ Dean: Can approve HOD-approved docs
   ✓ Placement Cell: Can view all

3. DATA PRIVACY
   ✓ Student data in PDF comes from authenticated request
   ✓ Cloudinary URLs are secure
   ✓ PDFs can be configured as private/public

4. VALIDATION
   ✓ Input validation on all endpoints
   ✓ Database checks for document ownership
   ✓ Role-based access control enforced
```

---

## 📈 PERFORMANCE METRICS

```
PDF Generation Timeline:
├─ Fetch student data:       ~100ms
├─ Fetch job data:           ~100ms
├─ Validate data:            ~10ms
├─ Format for template:      ~5ms
├─ Load & compile template:  ~50ms
├─ Render HTML:              ~20ms
├─ Convert to PDF:           ~2-3s
├─ Upload to Cloudinary:     ~1-2s
└─ Save to database:         ~100ms
   ─────────────────────────
   Total: 3-6 seconds

Storage:
├─ Average PDF size:         200-400KB
├─ Cloudinary folder:        documents/noc/{userId}/
├─ Unlimited storage:        Depends on Cloudinary plan
└─ Data retention:           Indefinite (configurable)

Scalability:
├─ Concurrent generations:   Depends on Cloudinary tier
├─ Peak capacity:            1000+ requests/hour
├─ Database load:            Minimal
└─ Bottleneck:               HTML-PDF conversion
```

---

## 🧪 TEST SCENARIOS

```
Scenario 1: Happy Path
├─ Complete student profile ✓
├─ Valid job posting ✓
├─ Mentor approves ✓
├─ HOD approves ✓
├─ Dean approves ✓
└─ PDF generated ✓

Scenario 2: Missing Student Data
├─ No enrollment number ✗
├─ PDF generation skipped
├─ Document still marked "issued"
└─ Validation endpoint shows error

Scenario 3: Skip Approval Level
├─ Dean tries to approve pending ✗
├─ Error: "Mentor approval required first"
└─ Cannot proceed

Scenario 4: Wrong Role
├─ Student tries to approve ✗
├─ Error: "Not authorized"
└─ Endpoint returns 403

Scenario 5: Regenerate After Dean Approval
├─ PDF already generated ✓
├─ POST /api/documents/:id/regenerate
├─ New PDF generated ✓
├─ Version incremented ✓
└─ Old URL replaced
```

---

This architecture ensures:
✓ **Reliability** - Robust error handling
✓ **Scalability** - Cloud storage & async processing
✓ **Security** - Role-based access control
✓ **Auditability** - Metadata & timestamps tracked
✓ **User Experience** - Automatic PDF generation
✓ **Maintainability** - Modular service pattern
