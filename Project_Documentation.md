# Streamlining Project Documentation

## 1. What This Project Is
**"Streamlining"** (also referred to as SS-real) is a **Comprehensive University Placement and Internship Management Portal**. It serves as a centralized platform to bridge the gap between students, university faculty (Mentors, HODs, Deans, Internal Guides), Placement Cells, and Recruiters.

## 2. What It Is Doing
The platform digitalizes and automates the entire lifecycle of a student's placement and internship journey. It eliminates manual paperwork and fragmented communication by providing dedicated dashboards for every stakeholder. From the moment a student uploads their resume to the day they download their No Objection Certificate (NOC) for an internship, every step is tracked, verified, and managed within the system.

## 3. Technology Stack Used
The project is built using the **MERN** stack, augmented with AI capabilities and document generation tools:

### Frontend (User Interface)
- **React.js**: Core framework for building the single-page application.
- **Tailwind CSS**: Utility-first CSS framework for highly customized, responsive styling.
- **Lucide React**: Beautiful, consistent iconography.
- **React Router DOM**: Client-side routing for navigating between dashboards.
- **Axios**: HTTP client for API requests to the backend.

### Backend (Server & API)
- **Node.js & Express.js**: Server runtime and API framework.
- **MongoDB & Mongoose**: NoSQL database and ODM for flexible data modeling.
- **JWT (JSON Web Tokens)**: Secure, stateless authentication and authorization.
- **Cloudinary**: Cloud storage for profile images, resumes, and offer letters.
- **Multer**: Middleware for handling `multipart/form-data` (file uploads).
- **html-pdf & Handlebars (hbs)**: PDF generation engine. HTML templates are written in Handlebars, populated with student data, and converted to downloadable PDFs.

### AI Integration
- Uses AI to automatically parse uploaded resumes, extract key fields (Name, CGPA, GitHub, LinkedIn), and auto-populate the student's profile.
- Powers an **AI Recommendation Engine** that matches students with jobs based on a compatibility score between their skills and the job requirements.

---

## 4. Key Workflows and How It Works

### A. Role-Based Access Control (RBAC)
The system automatically routes users to their specific dashboard upon login based on their role:
1. **Student**: Applies to jobs, submits internship forms, requests documents.
2. **Mentor**: Approves tier-1 document requests, guides a specific batch of students.
3. **HOD (Head of Department)**: Approves tier-2 document requests, oversees department placements.
4. **Dean (Dean / Director)**: Final approver for documents (triggers PDF generation).
5. **Internal Guide**: Tracks and approves 8th-semester internship weekly logs for assigned students.
6. **Recruiter**: Posts jobs, reviews applications, schedules interviews, and hires students.
7. **Placement Cell / Admin**: Oversees the entire university statistics, manages all users and jobs.

### B. Job Application Workflow
1. **Posting**: Recruiter posts a new Job/Internship opportunity.
2. **Matching**: Students see an "Opportunity Hub" where AI suggests best-matched jobs based on their parsed resume.
3. **Application**: Student applies. Profile completeness (resume, CGPA) is validated before submission.
4. **Tracking**: The application moves through statuses: `Applied` → `Shortlisted` → `Interview Scheduled` → `Selected` / `Rejected`.
5. **Offer**: Upon selection, the student must upload their official **Offer Letter** (PDF) to the portal. This unlocks further features.

### C. 8th Semester Internship Form & Weekly Logs Workflow
1. **Form Submission**: An 8th-semester student fills out an Internship Form containing company details, location, role, and stipend.
2. **Guide Assignment**: The system or HOD assigns an **Internal Guide** (faculty member) to the student.
3. **Weekly Logs**: The student logs in weekly to submit "Weekly Logs" (tasks completed, hours worked).
4. **Review**: The Internal Guide logs into their dashboard, views their assigned students, and approves or rejects the weekly logs, ensuring academic requirements are met while the student is in the industry.

### D. Automated Document Generation Workflow (NOC / LOR / Bonafide)
Instead of running from office to office, students request documents digitally:
1. **Prerequisite**: The student MUST have uploaded an Offer Letter.
2. **Request Submission**: Student requests a No Objection Certificate (NOC), Letter of Recommendation (LOR), or Bonafide Certificate. They fill in details like "Applying For" or "Mode of Work".
3. **3-Tier Approval Flow**:
   - **Step 1 - Mentor Approval**: Student's mentor reviews and approves.
   - **Step 2 - HOD Approval**: Passes to the HOD's dashboard for approval.
   - **Step 3 - Dean Approval**: Passes to the Dean's dashboard.
4. **PDF Generation**: When the Dean clicks "Approve", the backend dynamically injects the student's data (Name, Enrollment No, Company, CGPA) into a `.hbs` (Handlebars) template, converts it to a PDF using `html-pdf`, and saves it locally.
5. **Download**: The document status changes to `Issued` on the student dashboard, and a secure download link appears, allowing the student to fetch the official PDF instantly.

---

## 5. Architectural Summary
- **Stateless Architecture**: The backend uses JWTs for stateless auth, meaning the server pairs well with the React frontend and can be scaled easily.
- **RESTful APIs**: Organized purely by feature routes (`/api/jobs`, `/api/applications`, `/api/documents`, `/api/profile`).
- **Data Validation & Security**: Front-end validates form completeness (preventing document requests without offer letters, or applications without resumes) while the back-end robustly validates inputs before performing CRUD operations or executing PDF generations.
