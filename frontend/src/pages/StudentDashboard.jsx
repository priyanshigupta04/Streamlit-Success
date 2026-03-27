import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import axios from "../api/axios";
import Navbar from '../components/Navbar';
import UserProfile from '../components/UserProfile';

import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Edit, Github, Linkedin, Plus, Upload, X, 
  Mail, Phone, ShieldCheck, Search, Briefcase, Clock, FileText, CheckCircle2, User, GraduationCap,
  Calendar, BookOpen, Star, Filter, Download, ArrowRight, LayoutDashboard, Send,Camera
,Award,FileCheck,Zap,Settings,} from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [docFormData, setDocFormData] = useState({
  orgName: '',
  role: '',
  mode: '',
  startDate: '',
  duration: '',
  applyingFor: '',
  targetUni: '',
  faculty: '',
  achievements: '',
  bonafidePurpose: ''
});

  const [internshipFormData, setInternshipFormData] = useState({
    companyName: '',
    role: '',
    stipend: '',
    companyAddress: '',
    joiningDate: '',
    internshipPeriod: '',
    extraDetails: ''
  });
  
  const [submittedForms, setSubmittedForms] = useState([]);

  useEffect(() => {
    if (activeTab === 'internship_form') {
      fetchInternshipForms();
    } else if (activeTab === 'docs') {
      fetchDocuments();
    }
  }, [activeTab]);

  const fetchInternshipForms = async () => {
    try {
      const res = await axios.get('/api/internship-forms');
      setSubmittedForms(res.data);
    } catch (error) {
      console.error("Failed to fetch internship forms", error);
    }
  };

  // Fetch document requests from backend
  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents/mine');
      console.log('📋 Documents fetched:', res.data);
      setDocRequests(res.data.documents || []);
    } catch (error) {
      console.error("❌ Failed to fetch documents:", error);
    }
  };
  
  const handleDownload = (docUrl, docType) => {
    console.log('📥 Attempting to download:', docUrl);
    if (!docUrl) {
      alert('Document URL not available. Please contact admin.');
      return;
    }
    // Force download by opening in new window
    window.open(docUrl, '_blank', 'noopener,noreferrer');
  };
  // 1. PROFILE STATE
  const [profile, setProfile] = useState({
    fullName: user?.name || 'New Student',
    contact: '',
    email: user?.email || '',
    altEmail: '',
    github: '',
    linkedin: '',
    cgpa: '',
    admissionYear: '',
    graduationYear: '',
    enrollmentNo: '',
    department: '',
    semester: '',
    branch: '',
    specialization: '', 
    skills: '',
    resumeName: '',
    resumeUrl: '',
    internshipReason: '',
    image: null,
  certificates: [{ org: '', file: null }],
  });

   const [selectedFile, setSelectedFile] = useState(null);
  const normalizeUser = (data) => ({
    fullName: data.name || data.fullName || 'New Student',
    contact: data.contact || '',
    email: data.email || user?.email || '',
    altEmail: data.altEmail || '',
    github: data.github || '',
    linkedin: data.linkedin || '',
    cgpa: data.cgpa || '',
    admissionYear: data.admissionYear || '',
    graduationYear: data.graduationYear || '',
    enrollmentNo: data.enrollmentNo || '',
    department: data.department || '',
    semester: data.semester || '',
    branch: data.branch || '',
    specialization: data.specialization || '',
    skills: Array.isArray(data.skills) ? data.skills.join(', ') : (data.skills || ''),
    resumeName: data.resumeName || '',
    resumeUrl: data.resumeUrl || '',
    internshipReason: data.internshipReason || '',
    image: data.image || null,
    certificates: data.certificates && data.certificates.length ? data.certificates : [{ org: '', file: null }]
  });

  const denormalizeUser = (profile) => {
    const payload = { ...profile, name: profile.fullName };
    delete payload.fullName;
    return payload;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/api/profile");
        setProfile(normalizeUser(res.data));
      } catch (err) {
        console.error("Profile fetch failed", err);
      }
    };

    fetchProfile();
    fetchApplications();
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/jobs/recommended');
      const mapped = (res.data.jobs || []).map(j => ({
        id: j._id,
        company: j.company,
        role: j.title,
        loc: j.location || '',
        pay: j.stipend || '',
        logo: (j.company || '?')[0].toUpperCase(),
        color: 'bg-slate-700',
        matchData: j.matchData || null,
        raw: j,
      }));
      setJobs(mapped);
    } catch (err) {
      console.error('Failed to load recommended jobs', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get('/api/applications/mine');
      const apps = (res.data.applications || []).map(a => ({
  id: a._id,
  jobId: a.jobId?._id || a.jobId || null,
  company: a.jobId?.company || a.company || 'Unknown',
  role: a.jobId?.title || a.jobTitle || 'Role',
  loc: a.jobId?.location || a.location || '',
  pay: a.jobId?.stipend || a.stipend || '',
  logo: (a.jobId?.company || a.company || '?')[0].toUpperCase(),
  color: 'bg-slate-700',
  status: a.status,
  
  mentorApproved: a.mentorApproval?.approved || false,
  interview: a.interview ? {
  date: a.interview.date,
  time: a.interview.time,
  mode: a.interview.mode,
  meetingLink: a.interview.meetingLink
} : null,   // ⭐ ADD THIS
  date: new Date(a.createdAt).toLocaleDateString(),
}));
      setMyApplications(apps);
    } catch (err) {
      console.error('Failed to load applications', err);
    }
  };

  const syncProfile = async () => {
    try {
      const payload = denormalizeUser(profile);
      const res = await axios.put('/api/profile', payload);
      // server returns updated user object
      setProfile(normalizeUser(res.data));
      setShowModal(false);
      alert('Profile Updated Successfully!');
    } catch (err) {
      console.error('Profile sync failed', err);
      alert('Profile is not updated. Please try again.');
    }
  };

  // ── Upload State ──────────────────────────────────────────────────────
  const [uploading, setUploading] = useState({ image: false, resume: false });
  const [uploadProgress, setUploadProgress] = useState({ image: 0, resume: 0 });
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // ── Upload Handlers ────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Instant local preview
    setProfile(prev => ({ ...prev, image: URL.createObjectURL(file) }));
    try {
      setUploading(prev => ({ ...prev, image: true }));
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post('/api/upload/image', fd, {
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total || 1));
          setUploadProgress(prev => ({ ...prev, image: pct }));
        },
      });
      setProfile(prev => ({ ...prev, image: res.data.imageUrl }));
    } catch (err) {
      console.error('Image upload failed', err);
      alert('Image upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(prev => ({ ...prev, image: false }));
      setUploadProgress(prev => ({ ...prev, image: 0 }));
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // basic client‑side validation
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }
    const MAX = 10 * 1024 * 1024; // match server limit
    if (file.size > MAX) {
      alert('Resume must be smaller than 10 MB');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, resume: true }));
      setUploadProgress(prev => ({ ...prev, resume: 0 }));
      const fd = new FormData();
      fd.append('resume', file);
      const res = await axios.post('/api/upload/resume', fd, {
        // do NOT manually set Content-Type – axios will add the boundary for us
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total || 1));
          setUploadProgress(prev => ({ ...prev, resume: pct }));
        },
      });
      const { parsedFields = {}, aiAnalysis: ai = {}, resumeUrl, resumeName } = res.data;
      // Auto-fill profile from parsed resume
      setProfile(prev => ({
        ...prev,
        resumeName: resumeName || file.name,
        resumeUrl: resumeUrl || '',
        ...(parsedFields.name     && { fullName:  parsedFields.name }),
        ...(parsedFields.contact  && { contact:   parsedFields.contact }),
        ...(parsedFields.github   && { github:    parsedFields.github }),
        ...(parsedFields.linkedin && { linkedin:  parsedFields.linkedin }),
        ...(parsedFields.cgpa     && { cgpa:      parsedFields.cgpa }),
        ...(parsedFields.branch   && { branch:    parsedFields.branch }),
        ...(parsedFields.skills?.length && {
          skills: Array.isArray(parsedFields.skills)
            ? parsedFields.skills.join(', ')
            : parsedFields.skills,
        }),
      }));
      if (ai && Object.keys(ai).length) setAiAnalysis(ai);
      const skillCount = parsedFields.skills?.length || 0;
      alert(`✅ Resume uploaded! ${skillCount ? skillCount + ' skills detected. ' : ''}Fields auto-filled from resume.`);
    } catch (err) {
      console.error('Resume upload failed', err);
      let msg = err.message;
      if (err.response) {
        // show whatever the server returned if available
        console.error('server response', err.response.data);
        const data = err.response.data;
        if (data) {
          msg = data.message || JSON.stringify(data);
        }
      }
      alert('Resume upload failed: ' + msg);
    } finally {
      setUploading(prev => ({ ...prev, resume: false }));
      setUploadProgress(prev => ({ ...prev, resume: 0 }));
    }
  };

  // 2. WEEKLY LOGS STATE
  const [logs, setLogs] = useState([]);
  const [logInput, setLogInput] = useState({ week: '', hours: '', tasks: '' });
  const [activeDocType, setActiveDocType] = useState(null); 
// const [docFormData, setDocFormData] = useState({});


  const handleLogSubmit = () => {
    if (!logInput.week || !logInput.tasks) {
      alert("Please fill in the Week and Tasks.");
      return;
    }
    const newLog = {
      ...logInput,
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      status: 'Pending Review'
    };
    setLogs([newLog, ...logs]);
    setLogInput({ week: '', hours: '', tasks: '' });
  };
  //NOC
  const handleSubmit = async () => {
  const { orgName, role, mode, startDate, duration, applyingFor, targetUni, faculty, achievements, bonafidePurpose } = docFormData;

  // 1. NOC Validation
  if (activeDocType === 'NOC Request') {
    if (!orgName || !role || !mode) {
      alert("⚠️ Please fill Company, Role, and Mode fields!");
      return;
    }
  } 
  // 2. LOR Validation
  else if (activeDocType === 'LOR Request') {
    if (!applyingFor || !targetUni || !faculty || !achievements) {
      alert("⚠️ Please fill all details for LOR Request!");
      return;
    }
  } 
  // 3. Bonafide Validation
  else if (activeDocType === 'Bonafide') {
    if (!bonafidePurpose) {
      alert("⚠️ Please select the purpose for Bonafide Certificate!");
      return;
    }
  }

  // Agar validation pass ho gaya toh submit karein
  await handleDocRequest(activeDocType);
};  

  const handleInternshipSubmit = async () => {
    const { companyName, role, stipend, companyAddress, joiningDate, internshipPeriod } = internshipFormData;
    if (!companyName || !role || !stipend || !companyAddress || !joiningDate || !internshipPeriod) {
      alert("Please fill all required fields for the Internship Form!");
      return;
    }
    try {
      await axios.post('/api/internship-forms', internshipFormData);
      alert("Internship Form submitted successfully!");
      setInternshipFormData({
        companyName: '', role: '', stipend: '', companyAddress: '',
        joiningDate: '', internshipPeriod: '', extraDetails: ''
      });
      fetchInternshipForms();
    } catch (err) {
       alert("Failed to submit form: " + (err.response?.data?.message || err.message));
    }
  };
  // 3. DOCUMENT REQUESTS STATE 
  const [docRequests, setDocRequests] = useState([]);

  const handleDocRequest = async (type) => {
    try {
      let docType = '';
      let reason = '';
      let jobId = null;
      
      // Determine document type and extract relevant data
      if (type === 'NOC Request') {
        docType = 'noc';
        reason = `NOC for ${docFormData.orgName} - ${docFormData.role} role`;
        
        // Find the matching application/job for this company
        const matchingApp = myApplications.find(app => 
          app.company?.toLowerCase() === docFormData.orgName?.toLowerCase()
        );
        if (matchingApp?.jobId) {
          jobId = matchingApp.jobId;
        }
        
        if (!jobId) {
          alert('⚠️ Could not find matching job application. Please apply for a job first before requesting NOC.');
          return;
        }
      } else if (type === 'LOR Request') {
        docType = 'custom';
        reason = `LOR for ${docFormData.applyingFor}`;
      } else if (type === 'Bonafide') {
        docType = 'bonafide';
        reason = docFormData.bonafidePurpose;
      }
      
      // Call backend API
      const res = await axios.post('/api/documents/', {
        type: docType,
        reason: reason,
        jobId: jobId || null
      });
      
      const newRequest = {
        id: res.data.document._id,
        type: type,
        status: 'Pending',
        date: new Date().toLocaleDateString(),
        apiData: res.data.document
      };
      setDocRequests([newRequest, ...docRequests]);
      alert(`✅ ${type} submitted successfully! Status: Pending Approval`);
      
      // Reset form
      setDocFormData({
        orgName: '', role: '', mode: '', startDate: '', duration: '',
        applyingFor: '', targetUni: '', faculty: '', achievements: '',
        bonafidePurpose: ''
      });
      setSelectedFile(null);
      setActiveDocType(null);
      
    } catch (err) {
      console.error('Document request failed:', err);
      const errorMsg = err.response?.data?.message || err.message;
      alert(`❌ Failed to submit ${type}: ${errorMsg}`);
    }
  };

  // 4. JOBS & APPLICATIONS STATE
  const [myApplications, setMyApplications] = useState([]);
  const scheduledInterview = myApplications.find(
  app =>
    ["interview_scheduled", "interview"].includes(app.status) &&
    app.interview
);
  const [jobs, setJobs] = useState([]);
  // IDs of jobs the student has already applied to
  const appliedJobIds = new Set(
    myApplications
      .map(a => a.jobId || a.id)  // use jobId if available
      .filter(Boolean)
  );

  const filteredJobs = jobs
    .filter(job => !appliedJobIds.has(job.id))   // hide already-applied jobs
    .filter(job =>
      job.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  
  const handleApply = async (job) => {
  // Validation: Check if Profile is complete
  if(!profile.resumeName || !profile.cgpa) {
    alert("Incomplete Profile: Please upload your Resume and enter CGPA first.");
    setShowModal(true); 
    return;
  }

  // Double Apply check (local state) - use ID instead of title/company as company might not be fully loaded
  const alreadyApplied = myApplications.find(a => (a.jobId?._id === job.id || a.id === job.id) || (a.company === job.company && a.role === job.role));
  if (alreadyApplied) {
    alert("You have already applied for this role!");
    return;
  }

  try {
    const response = await axios.post(`/api/applications/${job.id}/apply`, {
      coverNote: "Applying via AI Recommendation"
    });
    alert('✓ Application submitted successfully!');
    // Refresh applications to get real IDs from backend
    setTimeout(() => fetchApplications(), 500);
  } catch (err) {
    const errorMsg = err.response?.data?.message || 'Failed to apply. Please try again.';
    alert('❌ ' + errorMsg);
  }
};
  // --- YAHAN PASTE KAREIN ---
const getProfileStatus = () => {
  // 1. Check karein agar koi internship 'Active' ya 'Ongoing' hai (Microsoft case)
  // Hum check kar rahe hain ki kya koi aisi application hai jiska status Approved/Active hai
  const isOngoing = myApplications.some(app =>
    ['selected','offer_accepted','interview_scheduled'].includes(app.status?.toLowerCase())
  );
  const hasPending = myApplications.some(app =>
    ['applied','shortlisted'].includes(app.status?.toLowerCase())
  );

  if (isOngoing) {
    return { 
      label: 'Ongoing', 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      border: 'border-blue-100' 
    };
  }
  
  if (hasPending) {
    return { 
      label: 'Applied', 
      color: 'text-amber-600', 
      bg: 'bg-amber-50', 
      border: 'border-amber-100' 
    };
  }

  // 3. Default: Active (Jab user free hai apply karne ke liye)
  return { 
    label: 'Active', 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-100' 
  };
};

const status = getProfileStatus();
// --------------------------

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans text-slate-900">
      {/* NAVBAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        logout={logout}
        onLogoutClick={() => setShowLogoutConfirm(true)}
        profile={profile}
      />

      <main className="max-w-[1400px] mx-auto p-10">
        {scheduledInterview && (
  <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl mb-6 flex justify-between items-center">
    
    <div>
      <p className="text-xs font-bold text-indigo-600 uppercase">
        Interview Scheduled
      </p>

      <p className="font-semibold">
        {scheduledInterview.company} — {scheduledInterview.role}
      </p>

      <p className="text-sm text-gray-600">
        {scheduledInterview.interview.date} • {scheduledInterview.interview.time}
      </p>
    </div>

    {scheduledInterview.interview.meetingLink && (
      <a
        href={scheduledInterview.interview.meetingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm"
      >
        Join Interview
      </a>
    )}

  </div>
)}
  <div className="grid grid-cols-12 gap-8"> {/* Grid Wrapper Added */}
    
    {/* 1. PROFILE SUMMARY SIDEBAR (4 Columns) */}
    <UserProfile profile={profile} status={status} setShowModal={setShowModal} />

    {/* 2. MAIN CONTENT AREA (8 Columns) */}
    <div className="col-span-12 lg:col-span-8">
      
      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 fade-in">
          <div className="flex justify-between items-end px-4">
            <div>
              <h3 className="text-3xl font-black tracking-tight mb-1 italic uppercase">Opportunity Hub</h3>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Verified Roles</p>
            </div>
            <Filter size={20} className="text-slate-300" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map(job => (
              <div key={job.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 hover:border-black transition-all group shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-12 h-12 ${job.color} rounded-2xl flex items-center justify-center text-white text-lg font-black`}>{job.logo}</div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.loc}</span>
                    {job.matchData && job.matchData.overallScore >= 0 && (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${job.matchData.overallScore > 75 ? 'bg-green-100 text-green-700' : job.matchData.overallScore > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {job.matchData.overallScore}% AI Match
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-xl font-black mb-1">{job.role}</h4>
                <p className="text-slate-400 font-bold text-xs mb-8 uppercase tracking-tighter">{job.company} • {job.pay}</p>
                <button onClick={() => handleApply(job)} className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${myApplications.some(a => a.company === job.company && a.role === job.role) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 hover:bg-black hover:text-white'}`}>
                  {myApplications.some(a => a.company === job.company && a.role === job.role) ? 'Pending Approval' : 'Quick Apply'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === 'applications' && (
        <div className="space-y-8 fade-in">
          <div className="bg-black rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Active Internship</span>
                  <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none mt-3">Microsoft</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Software Engineer Intern</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black opacity-40 uppercase mb-1">Mentor</p>
                  <p className="text-sm font-bold italic text-emerald-400">Dr. Rajesh Kumar</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-2xl font-black italic">45% <span className="text-[12px] opacity-40 font-normal">Completed</span></p>
                  <p className="text-sm font-bold">June 2026</p>
                </div>
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>
          {/* History */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Submission History</h3>
            <div className="space-y-4">
              {myApplications.map((app, i) => (
  <div key={i} className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:border-black transition-all">

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black italic">
          {app.logo}
        </div>

        <div>
          <p className="font-black text-sm uppercase">{app.company}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">{app.role}</p>
        </div>
      </div>

      <div className="text-right space-y-1">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
          {app.status}
        </span>
      </div>
    </div>

    {/* ⭐ INTERVIEW SCHEDULE COMPONENT */}
    {["interview_scheduled","interview"].includes(app.status) && app.interview && (
      <div className="mt-4 bg-indigo-50 border border-indigo-200 p-4 rounded-xl">

        <p className="text-xs font-bold text-indigo-700 uppercase mb-2">
          Interview Scheduled
        </p>

        <p className="text-sm">
          Date: {new Date(app.interview.date).toLocaleDateString()}
        </p>

        <p className="text-sm">
          Time: {app.interview.time}
        </p>

        <p className="text-sm">
          Mode: {app.interview.mode}
        </p>

        {app.interview.meetingLink && (
          <a
            href={app.interview.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline text-sm"
          >
            Join Meeting
          </a>
        )}

      </div>
    )}

  </div>
))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-10 fade-in">
          <div className="bg-black text-white p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Progress Reporting</h3>
            <div className="space-y-6 max-w-2xl mt-10">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Week" className="w-full p-4 bg-white/10 rounded-2xl outline-none" value={logInput.week} onChange={(e) => setLogInput({...logInput, week: e.target.value})}/>
                <input type="number" placeholder="Hours" className="w-full p-4 bg-white/10 rounded-2xl outline-none" value={logInput.hours} onChange={(e) => setLogInput({...logInput, hours: e.target.value})}/>
              </div>
              <textarea className="w-full p-4 bg-white/10 rounded-2xl outline-none h-32" placeholder="Tasks achieved..." value={logInput.tasks} onChange={(e) => setLogInput({...logInput, tasks: e.target.value})}></textarea>
              <button onClick={handleLogSubmit} className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-[11px] flex items-center gap-3">
                <Send size={16}/> Submit Log
              </button>
            </div>
          </div>
          {/* Log History */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] mb-4">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-black text-white rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black opacity-50">WK</span>
                    <span className="text-lg font-black">{log.week}</span>
                  </div>
                  <p className="text-sm font-black text-slate-900">{log.tasks}</p>
                </div>
                <span className="text-[9px] font-black uppercase px-4 py-2 rounded-full bg-amber-50 text-amber-600">{log.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS */}
      {activeTab === 'docs' && (
        <div className="space-y-8 fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['NOC Request', 'LOR Request', 'Bonafide'].map(doc => (
              <div key={doc} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 text-center hover:border-black transition-all group shadow-sm">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-black group-hover:text-white transition-all">
                  <FileText size={24}/>
                </div>
                <h4 className="font-black text-lg mb-1 italic uppercase">{doc}</h4>
                <button onClick={() => setActiveDocType(doc)} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase mt-4">
                  Request Now
                </button>
              </div>
            ))}
          </div>

          {/* Request Tracking */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xl font-black italic uppercase">Document Requests</h4>
              <button 
                onClick={fetchDocuments}
                className="p-2 text-slate-600 hover:text-black hover:bg-slate-100 rounded-lg transition-all"
                title="Refresh documents"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 0 1 14.85-3.36M22.88 20h-6v-6M20.49 9A9 9 0 0 0 5.64 3.64"></path>
                </svg>
              </button>
            </div>
            {docRequests.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-bold">No document requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {docRequests.map(req => {
                  // Map document types for display
                  const typeMap = {
                    'noc': 'NOC Request',
                    'bonafide': 'Bonafide Certificate',
                    'completion_certificate': 'Completion Certificate',
                    'experience_letter': 'Experience Letter',
                    'custom': 'Custom Document'
                  };
                  
                  // Map status for display
                  const statusMap = {
                    'pending': { label: 'Pending', color: 'bg-yellow-50 text-yellow-700' },
                    'mentor_approved': { label: 'Mentor Approved', color: 'bg-blue-50 text-blue-700' },
                    'hod_approved': { label: 'HOD Approved', color: 'bg-blue-50 text-blue-700' },
                    'issued': { label: 'Ready to Download ✓', color: 'bg-green-50 text-green-700' },
                    'rejected': { label: 'Rejected', color: 'bg-red-50 text-red-700' }
                  };
                  
                  const displayType = typeMap[req.type] || req.type;
                  const statusInfo = statusMap[req.overallStatus] || { label: req.overallStatus, color: 'bg-slate-50 text-slate-700' };
                  
                  return (
                    <div key={req._id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.8rem] border border-slate-100 hover:border-black transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <FileCheck size={20} className={req.overallStatus === 'issued' ? 'text-green-500' : 'text-slate-400'}/>
                        <div>
                          <p className="font-black text-xs uppercase italic">{displayType}</p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {new Date(req.createdAt).toLocaleDateString()}
                            {req.generatedAt && ` • Generated: ${new Date(req.generatedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black uppercase px-4 py-2 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        
                        {/* Download button for issued documents */}
                        {req.overallStatus === 'issued' ? (
                          req.generatedDocUrl ? (
                            <button 
                              onClick={() => handleDownload(req.generatedDocUrl, req.type)}
                              className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 text-xs font-bold active:scale-95"
                              title="Download PDF"
                            >
                              <Download size={16} />
                              <span className="hidden md:inline">Download</span>
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-orange-600 px-3 py-1 bg-orange-50 rounded-lg">
                              Generating PDF...
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {/* TAB 5: INTERNSHIP FORM */}
      {activeTab === 'internship_form' && (
        <div className="space-y-8 fade-in">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8">8th Sem Internship Form</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <input type="text" placeholder="Company Name *" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-black transition-colors" value={internshipFormData.companyName} onChange={(e) => setInternshipFormData({...internshipFormData, companyName: e.target.value})} />
              <input type="text" placeholder="Role / Position *" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-black transition-colors" value={internshipFormData.role} onChange={(e) => setInternshipFormData({...internshipFormData, role: e.target.value})} />
              <input type="text" placeholder="Stipend (e.g., ₹20,000 or Unpaid) *" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-black transition-colors" value={internshipFormData.stipend} onChange={(e) => setInternshipFormData({...internshipFormData, stipend: e.target.value})} />
              <input type="text" placeholder="Company Address *" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-black transition-colors" value={internshipFormData.companyAddress} onChange={(e) => setInternshipFormData({...internshipFormData, companyAddress: e.target.value})} />
              <input type="date" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs text-slate-500 focus:border-black transition-colors" value={internshipFormData.joiningDate} onChange={(e) => setInternshipFormData({...internshipFormData, joiningDate: e.target.value})} />
              <input type="text" placeholder="Internship Period (e.g., 6 Months) *" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-black transition-colors" value={internshipFormData.internshipPeriod} onChange={(e) => setInternshipFormData({...internshipFormData, internshipPeriod: e.target.value})} />
              <textarea placeholder="Extra Details (Optional)" className="col-span-1 md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-xs h-32 focus:border-black transition-colors" value={internshipFormData.extraDetails} onChange={(e) => setInternshipFormData({...internshipFormData, extraDetails: e.target.value})} />
            </div>
            <button onClick={handleInternshipSubmit} className="w-full py-5 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3">
              <Send size={18} /> Submit Application
            </button>
          </div>

          {/* Form History */}
          {submittedForms.length > 0 && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h4 className="text-xl font-black italic uppercase mb-6">Submitted Forms</h4>
              <div className="space-y-4">
                {submittedForms.map(form => (
                  <div key={form._id} className="p-6 bg-slate-50 rounded-[1.5rem] flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="font-black text-sm uppercase">{form.companyName}</p>
                      <p className="text-[10px] text-slate-500 font-bold">{form.role} • {new Date(form.joiningDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${form.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : form.status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {form.status}
                      </span>
                      {form.internalGuide && (
                        <p className="text-[10px] text-slate-500 mt-2">Guide: <span className="font-bold">{form.internalGuide?.name}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div> {/* Main Content Area Close */}
  </div> {/* Grid Wrapper Close */}

  {/* MODALS (Placed outside the grid for clean rendering) */}
  {activeDocType && (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setActiveDocType(null)}></div>
      <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 relative z-10 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter">{activeDocType}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase">Internship Portal Verification</p>
          </div>
          <button onClick={() => setActiveDocType(null)} className="p-3 bg-slate-100 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
            <X size={20}/>
          </button>
        </div>

        <div className="space-y-5">
          {/* Form Fields Based on Type */}
          {activeDocType === 'NOC Request' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Organization *" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-100" value={docFormData.orgName} onChange={(e) => setDocFormData({...docFormData, orgName: e.target.value})} />
                <input type="text" placeholder="Role *" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-100" value={docFormData.role} onChange={(e) => setDocFormData({...docFormData, role: e.target.value})} />
              </div>
              <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-100" value={docFormData.mode} onChange={(e) => setDocFormData({...docFormData, mode: e.target.value})}>
                <option value="">Select Mode *</option>
                <option value="In-Office">In-Office</option>
                <option value="Remote">Remote</option>
              </select>
              <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-2xl cursor-pointer ${selectedFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                <Upload size={18} className={selectedFile ? 'text-emerald-500' : 'text-slate-400'}/>
                <p className="text-[10px] font-black uppercase mt-2">{selectedFile ? selectedFile.name : "Attach Offer Letter (PDF) *"}</p>
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
              </label>
            </>
          )}

          {activeDocType === 'LOR Request' && (
             <div className="space-y-4">
                <input type="text" placeholder="Target University *" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-100" value={docFormData.targetUni} onChange={(e) => setDocFormData({...docFormData, targetUni: e.target.value})} />
                <textarea placeholder="Academic Achievements..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs h-28 border border-slate-100" value={docFormData.achievements} onChange={(e) => setDocFormData({...docFormData, achievements: e.target.value})} />
             </div>
          )}

          {activeDocType === 'Bonafide' && (
             <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-slate-100" value={docFormData.bonafidePurpose} onChange={(e) => setDocFormData({...docFormData, bonafidePurpose: e.target.value})}>
                <option value="">Select Purpose *</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Bank Loan">Bank Loan</option>
                <option value="Passport">Passport</option>
             </select>
          )}

          <button onClick={handleSubmit} className="w-full py-5 bg-black text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
            <Send size={16}/> Push Request to Mentor
          </button>
        </div>
      </div>
    </div>
  )}
  {showLogoutConfirm && (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowLogoutConfirm(false)}></div>
      <div className="bg-white w-full max-w-sm rounded-[1.5rem] p-6 relative z-10 shadow-2xl">
        <h3 className="text-lg font-black mb-4">Are you sure you want to logout?</h3>
        <div className="flex gap-4 justify-end">
          <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-lg bg-slate-100">Cancel</button>
          <button onClick={() => { logout(); setShowLogoutConfirm(false); navigate('/'); }} className="px-4 py-2 rounded-lg bg-rose-600 text-white">Logout</button>
        </div>
      </div>
    </div>
  )}
</main>
      {/* MASTER PROFILE MODAL */}
      {showModal && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 fade-in">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
    <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[3rem] relative z-10 shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20">
      
      {/* LEFT SIDEBAR: PROFILE IDENTITY (FIXED) */}
      <div className="w-full md:w-1/4 bg-slate-50 p-10 border-r border-slate-100 flex flex-col items-center overflow-y-auto">
          <div className="flex flex-col items-center w-full">
            <div className="relative group mb-6">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-4 border-white flex items-center justify-center">
                {profile.image ? (
                  <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-slate-200" />
                )}
                <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer text-white text-[8px] font-black uppercase tracking-widest">
                  <Camera size={20} className="mb-1"/>
                  {uploading.image ? `${uploadProgress.image}%` : 'Change Photo'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload}/>
                </label>
                {uploading.image && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 rounded-b-[2.5rem] overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress.image}%` }}></div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-xl font-black tracking-tight uppercase italic truncate w-full px-2">
                {profile.fullName || "Your Name"}
              </h3>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1">
                {profile.enrollmentNo || "Enrollment No"}
              </p>
            </div>

            {/* PREVIEW CARDS */}
            <div className="w-full space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center"><Linkedin size={14}/></div>
                <p className="text-[9px] font-bold truncate text-slate-500 flex-1">{profile.linkedin || "Not Linked"}</p>
              </div>
              
              <div className="p-5 bg-slate-900 rounded-[2rem] mt-4 w-full shadow-lg shadow-slate-200">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-3 tracking-widest">Verified Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const raw = profile.skills;
                    const list = Array.isArray(raw)
                      ? raw
                      : typeof raw === 'string' && raw.trim()
                        ? raw.split(',')
                        : [];
                    return list.length > 0
                      ? list.map((s, i) => (
                          <span key={i} className="text-[7px] font-bold bg-white/10 text-white px-2.5 py-1.5 rounded-lg uppercase">
                            {String(s).trim()}
                          </span>
                        ))
                      : <p className="text-[8px] text-slate-600 italic">No skills listed</p>;
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic mt-auto pt-10 text-center">
            Streamlining v2.0
          </div>
      </div>

      {/* RIGHT SIDE: SCROLLABLE CONTENT */}
      <div className="flex-1 p-12 overflow-y-auto bg-white custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* SECTION 1: PERSONAL & ACADEMIC INFO */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-6 bg-black rounded-full"></div>
                <h4 className="text-sm font-black uppercase italic tracking-widest">Primary Identity & Academics</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <input type="text" placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:border-slate-200 transition-all" value={profile.fullName} onChange={(e)=>setProfile({...profile, fullName: e.target.value})}/>
                  <input type="text" placeholder="Enrollment Number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:border-slate-200 transition-all" value={profile.enrollmentNo} onChange={(e)=>setProfile({...profile, enrollmentNo: e.target.value})}/>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Admission Year" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs" value={profile.admissionYear} onChange={(e)=>setProfile({...profile, admissionYear: e.target.value})}/>
                    <input type="text" placeholder="Graduation Year" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs" value={profile.graduationYear} onChange={(e)=>setProfile({...profile, graduationYear: e.target.value})}/>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Department" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs" value={profile.department} onChange={(e)=>setProfile({...profile, department: e.target.value})}/>
                    <input type="number" placeholder="Semester (e.g., 8)" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs" value={profile.semester} onChange={(e)=>setProfile({...profile, semester: e.target.value ? Number(e.target.value) : ''})}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Branch" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs" value={profile.branch} onChange={(e)=>setProfile({...profile, branch: e.target.value})}/>
                    <select className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs text-slate-500" value={profile.specialization} onChange={(e)=>setProfile({...profile, specialization: e.target.value})}>
                      <option value="">Specialization</option>
                      <option value="CSE">CSE</option><option value="IT">IT</option><option value="AI">AI/ML</option>
                    </select>
                    <input type="text" placeholder="CGPA" className="p-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs border border-transparent focus:border-emerald-200" value={profile.cgpa} onChange={(e)=>setProfile({...profile, cgpa: e.target.value})}/>
                  </div>
                  <input type="text" placeholder="Professional Skills (React, Python...)" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs" value={profile.skills} onChange={(e)=>setProfile({...profile, skills: e.target.value})}/>
                </div>
              </div>
            </section>

            {/* SECTION 2: COMMUNICATION & SOCIALS */}
            <section className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Contact & Social Connectivity</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input type="text" placeholder="Contact Number" className="w-full p-4 bg-white rounded-xl shadow-sm outline-none font-bold text-xs" value={profile.contact} onChange={(e)=>setProfile({...profile, contact: e.target.value})}/>
                  <input type="email" placeholder="Primary Email" className="w-full p-4 bg-slate-100 rounded-xl outline-none font-bold text-xs text-slate-400" value={profile.email} readOnly/>
                  <input type="email" placeholder="Alternative Email" className="w-full p-4 bg-white rounded-xl shadow-sm outline-none font-bold text-xs" value={profile.altEmail} onChange={(e)=>setProfile({...profile, altEmail: e.target.value})}/>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center bg-white rounded-xl shadow-sm px-4 border border-slate-100"><Github size={14} className="text-slate-400"/><input type="text" placeholder="GitHub URL" className="w-full p-4 bg-transparent outline-none font-bold text-xs" value={profile.github} onChange={(e)=>setProfile({...profile, github: e.target.value})}/></div>
                  <div className="flex items-center bg-white rounded-xl shadow-sm px-4 border border-slate-100"><Linkedin size={14} className="text-blue-500"/><input type="text" placeholder="LinkedIn URL" className="w-full p-4 bg-transparent outline-none font-bold text-xs" value={profile.linkedin} onChange={(e)=>setProfile({...profile, linkedin: e.target.value})}/></div>
               </div>
            </section>

            {/* SECTION 3: RESUME & CERTIFICATIONS */}
            <section className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CV Upload */}
                <div className="md:col-span-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-3 block ml-2">Master CV (PDF)</label>
                  <label className={`flex flex-col items-center justify-center w-full h-[180px] border-2 border-dashed rounded-[2.5rem] cursor-pointer group transition-all ${uploading.resume ? 'border-emerald-400 bg-emerald-50' : profile.resumeName ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                    {uploading.resume ? (
                      <div className="flex flex-col items-center gap-3 w-full px-6">
                        <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[9px] font-black text-emerald-600 uppercase">Uploading & Parsing…</p>
                        <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress.resume}%` }}></div>
                        </div>
                        <p className="text-[9px] font-black text-emerald-500">{uploadProgress.resume}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className={`w-6 h-6 mb-2 transition-colors ${profile.resumeName ? 'text-emerald-500' : 'text-slate-300 group-hover:text-black'}`} />
                        <p className="text-[9px] font-black text-slate-500 uppercase px-4 text-center">{profile.resumeName || 'Upload Resume'}</p>
                        {profile.resumeName && <p className="text-[8px] text-emerald-500 font-bold mt-1">✓ Uploaded</p>}
                      </>
                    )}
                    <input type="file" className="hidden" accept=".pdf" onChange={handleResumeUpload} disabled={uploading.resume}/>
                  </label>
                  {/* Preview Button */}
                  {profile.resumeUrl && !uploading.resume && (
                    <a
                      href={profile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                      <FileText size={12}/> Preview Resume
                    </a>
                  )}
                </div>

                {/* Certificates Vault */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-3 px-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-300">Certifications Vault</label>
                    <button 
                      onClick={() => setProfile({...profile, certificates: [...(profile.certificates || []), { id: Date.now(), org: '', title: '', fileName: null }]})}
                      className="px-4 py-1.5 bg-black text-white rounded-full text-[8px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      + Add New
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {(profile.certificates || []).map((cert, index) => (
                      <div key={cert.id || index} className="group relative flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:border-black/10 transition-all">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cert.fileName ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300'}`}>
                          {cert.fileName ? <FileCheck size={18}/> : <Award size={18}/>}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Title" className="bg-transparent outline-none font-black text-[10px] uppercase" value={cert.title} onChange={(e) => {
                             const newCerts = [...profile.certificates];
                             newCerts[index].title = e.target.value;
                             setProfile({...profile, certificates: newCerts});
                          }}/>
                          <label className="flex items-center justify-end gap-2 cursor-pointer">
                            <span className="text-[8px] font-bold text-slate-400 truncate max-w-[80px]">{cert.fileName || "Attach PDF"}</span>
                            <Upload size={12} className="text-slate-400"/>
                            <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                               const newCerts = [...profile.certificates];
                               newCerts[index].fileName = e.target.files[0]?.name;
                               setProfile({...profile, certificates: newCerts});
                            }}/>
                          </label>
                        </div>
                        <button onClick={() => setProfile({...profile, certificates: profile.certificates.filter((_, i) => i !== index)})} className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                          <X size={14}/>
                        </button>
                      </div>
                    ))}
                    {(!profile.certificates || profile.certificates.length === 0) && (
                      <div className="h-[200px] border-2 border-dashed border-slate-50 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                        <Award size={30} className="mb-2 opacity-20"/>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em]">No Credentials Added</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 4: AI ANALYSIS RESULTS (shown after resume upload) */}
            {aiAnalysis && (
              <section className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-emerald-400"/>
                    <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">AI Resume Analysis</h4>
                  </div>
                  <button onClick={() => setAiAnalysis(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                    <X size={14}/>
                  </button>
                </div>
                {/* Domain */}
                <div className="mb-6 p-4 bg-white/5 rounded-2xl">
                  <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Predicted Domain</p>
                  <p className="text-lg font-black">{aiAnalysis.domain || 'Unknown'}</p>
                  {aiAnalysis.confidence && (
                    <div className="mt-2">
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((aiAnalysis.confidence || 0) * 100)}%` }}></div>
                      </div>
                      <p className="text-[8px] text-slate-500 mt-1">{Math.round((aiAnalysis.confidence || 0) * 100)}% confidence</p>
                    </div>
                  )}
                </div>
                {/* Skills */}
                {aiAnalysis.skills?.length > 0 && (
                  <div className="mb-6">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-3">Detected Skills ({aiAnalysis.skills.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysis.skills.map((s, i) => (
                        <span key={i} className="text-[8px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1.5 rounded-lg uppercase">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Suggestions */}
                {aiAnalysis.suggestions?.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-3">Improvement Suggestions</p>
                    <div className="space-y-2">
                      {aiAnalysis.suggestions.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-white/5 rounded-xl">
                          <ArrowRight size={12} className="text-amber-400 mt-0.5 shrink-0"/>
                          <p className="text-[10px] text-slate-300">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            <button onClick={syncProfile} className="w-full py-6 bg-black text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-black/20 hover:bg-slate-800 transition-all active:scale-[0.98]">
              Synchronize Profile Data
            </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;