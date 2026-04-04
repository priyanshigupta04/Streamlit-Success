import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { validateProfilePayload } from '../utils/profileValidation';
import {
  Users, FileCheck, FileText, CheckCircle2, XCircle, Clock,
  Eye, LayoutDashboard, ArrowRight, AlertCircle, Search, Briefcase, FileSignature
  , UserCircle2
} from 'lucide-react';

const MentorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [appApprovalNote, setAppApprovalNote] = useState('');
  const [appActionId, setAppActionId] = useState(null);
  const [students, setStudents] = useState([]);
  const [interviewStudents, setInterviewStudents] = useState([]);
  const [internshipForms, setInternshipForms] = useState([]);
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState({});
  const [interviewError, setInterviewError] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    bio: '',
    specialization: '',
    expertiseTags: '',
    officeHours: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });
  const getDocType = (doc) => doc?.documentType || doc?.type || 'N/A';

  const getRequestDetailEntries = (doc) => {
    const details = doc?.requestDetails && typeof doc.requestDetails === 'object' ? doc.requestDetails : {};
    const entries = Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
      .map(([key, value]) => {
        const label = key
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
        const displayValue = Array.isArray(value)
          ? value.join(', ')
          : value instanceof Date
            ? value.toLocaleDateString()
            : key.toLowerCase().includes('date')
              ? new Date(value).toLocaleDateString()
              : String(value);

        return [label, displayValue];
      });

    if (doc?.reason) {
      entries.unshift(['Request Reason', doc.reason]);
    }

    return entries;
  };
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPendingDocs();
    fetchApplications();
    fetchStudents();
    fetchInterviewStudents();
    fetchInternshipForms();
    fetchGuides();
    fetchMyProfile();
  }, []);

  const fetchMyProfile = async () => {
    try {
      const res = await axios.get('/api/profile');
      const data = res.data || {};
      setProfileForm({
        name: data.name || user?.name || '',
        email: data.email || user?.email || '',
        department: data.department || '',
        phone: data.phone || data.contact || '',
        bio: data.bio || '',
        specialization: data.specialization || '',
        expertiseTags: data.expertiseTags || '',
        officeHours: data.officeHours || '',
        linkedinUrl: data.linkedinUrl || data.linkedin || '',
        githubUrl: data.githubUrl || data.github || '',
        portfolioUrl: data.portfolioUrl || '',
      });
    } catch (err) {
      console.error('Failed to fetch mentor profile', err);
    }
  };

  const saveMyProfile = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileFeedback({ type: '', message: '' });
      const payload = {
        name: profileForm.name,
        department: profileForm.department,
        phone: profileForm.phone,
        bio: profileForm.bio,
        specialization: profileForm.specialization,
        expertiseTags: profileForm.expertiseTags,
        officeHours: profileForm.officeHours,
        linkedinUrl: profileForm.linkedinUrl,
        githubUrl: profileForm.githubUrl,
        portfolioUrl: profileForm.portfolioUrl,
      };
      const validationError = validateProfilePayload(payload);
      if (validationError) {
        setProfileFeedback({ type: 'error', message: validationError });
        return;
      }
      await axios.put('/api/profile', payload);
      setProfileFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } catch (err) {
      setProfileFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchInternshipForms = async () => {
    try {
      const res = await axios.get('/api/internship-forms');
      console.log('📋 Internship Forms Response:', res.data);
      setInternshipForms(res.data);
    } catch (err) {
      console.error('Failed to fetch internship forms', err);
    }
  };

  const fetchGuides = async () => {
    try {
      const res = await axios.get('/api/internship-forms/guides');
      setGuides(res.data);
    } catch (err) {
      console.error('Failed to fetch guides', err);
    }
  };

  const handleApproveInternship = async (formId) => {
    try {
      if (!selectedGuide[formId]) {
        alert("Please select an internal guide before approving.");
        return;
      }
      await axios.put(`/api/internship-forms/${formId}/approve`, {
        internalGuideId: selectedGuide[formId]
      });
      alert("Internship Form Approved and Guide Assigned!");
      fetchInternshipForms();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve form");
    }
  };
  const fetchInterviewStudents = async () => {
  try {
    setInterviewError(null);
    const res = await axios.get('/api/mentors/interviews');
    setInterviewStudents(res.data.interviews || []);

  } catch (err) {
    const statusCode = err.response?.status;
    const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
    const fullError = `[${statusCode || 'Error'}] ${errorMsg}`;
    console.error('Failed to fetch interview students:', fullError);
    setInterviewError(fullError);
  }
};

  const fetchPendingDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/documents/pending');
      setPendingDocs(res.data.documents);
    } catch (err) {
      console.error('Failed to fetch pending documents', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get('/api/applications/all');
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axios.get('/api/mentors/students');
      console.log('👥 Students Response:', res.data);
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students', err);
    }
  };

  const handleViewOfferLetter = async (studentId, fileName = 'offer-letter.pdf') => {
    try {
      const response = await axios.get(`/api/upload/offer-letter/view/${studentId}`, {
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');

      // Fallback if popup is blocked by browser
      if (!opened) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'offer-letter.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error('Failed to open offer letter', err);
      alert(err.response?.data?.message || 'Failed to open offer letter');
    }
  };

  const handleApprove = async (docId, action) => {
    try {
      await axios.put(`/api/documents/${docId}/approve`, {
        decision: action, // 'approved' or 'rejected'
        note: approvalNote,
      });
      setApprovalNote('');
      fetchPendingDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleMentorApproveApplication = async (appId) => {
    try {
      await axios.put(`/api/applications/${appId}/mentor-approve`, {
        mentorNote: appApprovalNote,
      });
      setAppApprovalNote('');
      setAppActionId(null);
      alert('Application approved! Resume will be sent to recruiter.');
      fetchApplications();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleMentorRejectApplication = async (appId) => {
    try {
      await axios.put(`/api/applications/${appId}/mentor-reject`, {
        mentorNote: appApprovalNote,
      });
      setAppApprovalNote('');
      setAppActionId(null);
      alert('Application rejected. Student has been notified.');
      fetchApplications();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'my_profile', label: 'My Profile', icon: UserCircle2 },
    { key: 'applications', label: 'Student Applications', icon: Briefcase },
    { key: 'internship_forms', label: 'Internship Forms', icon: FileSignature },
    { key: 'documents', label: 'Document Approvals', icon: FileCheck },
    { key: 'students', label: 'My Students', icon: Users },
  ];

  const getStudentInterviews = (studentId) => {
    const filtered = interviewStudents.filter((app) => {
      const appStudentId = app.studentId?._id?.toString() || app.studentId?.toString();
      const matchStudentId = studentId?.toString ? studentId.toString() : studentId;
      return appStudentId === matchStudentId;
    });
    return filtered;
  };

  const formatInterviewDate = (dateValue) => {
    if (!dateValue) return 'Date not set';
    return new Date(dateValue).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        showProfileDropdown
        profileName={profileForm.name || user?.name}
        onProfileClick={() => setActiveTab('my_profile')}
      />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-64px)] p-4">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 text-lg">{user?.name}</h3>
            <p className="text-sm text-gray-500">Mentor</p>
          </div>
          <nav className="space-y-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Mentor Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={FileCheck} label="Pending Approvals" value={pendingDocs.length} color="bg-yellow-500" />
                <StatCard icon={Briefcase} label="Student Applications" value={applications.length} color="bg-blue-500" />
                <StatCard icon={CheckCircle2} label="Approved" value={applications.filter(a=>a.status==='selected').length} color="bg-green-500" />
              </div>

              {pendingDocs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-yellow-500" /> Pending Actions
                  </h3>
                  {pendingDocs.slice(0, 5).map(doc => (
                    <div key={doc._id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{doc.documentType}</p>
                        <p className="text-sm text-gray-500">By: {doc.studentId?.name || 'Student'}</p>
                      </div>
                      <button onClick={() => setActiveTab('documents')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        Review <ArrowRight size={14} className="inline" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'my_profile' && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Mentor Profile</h2>
                <p className="text-sm text-gray-500 mb-6">Update details used in approvals and notifications.</p>
                <form onSubmit={saveMyProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                      <input type="email" value={profileForm.email} disabled className="w-full border rounded-lg p-2.5 text-sm bg-gray-50 text-gray-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
                      <input
                        type="text"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Specialization</label>
                      <input
                        type="text"
                        value={profileForm.specialization}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, specialization: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expertise Tags</label>
                      <input
                        type="text"
                        value={profileForm.expertiseTags}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, expertiseTags: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="e.g. React, ML, Data Structures"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Office Hours</label>
                      <input
                        type="text"
                        value={profileForm.officeHours}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, officeHours: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="e.g. Mon-Fri 2:00 PM - 5:00 PM"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={profileForm.linkedinUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">GitHub URL</label>
                      <input
                        type="url"
                        value={profileForm.githubUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Portfolio / Website</label>
                      <input
                        type="url"
                        value={profileForm.portfolioUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                        placeholder="https://your-website.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bio</label>
                    <textarea
                      rows={4}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                      className="w-full border rounded-lg p-2.5 text-sm"
                    />
                  </div>
                  {profileFeedback.message && (
                    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${profileFeedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {profileFeedback.message}
                    </div>
                  )}
                  <button type="submit" disabled={profileSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* DOCUMENT APPROVALS */}
          {activeTab === 'documents' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Document Approvals</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : pendingDocs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No pending document approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDocs.map(doc => (
                    <div key={doc._id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">{doc.documentType}</h3>
                          <p className="text-sm text-gray-500">
                            Student: {doc.studentId?.name} • Requested: {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          {doc.overallStatus.replace('_', ' ')}
                        </span>
                      </div>
                      {doc.purpose && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-4">{doc.purpose}</p>
                      )}
                      {getRequestDetailEntries(doc).length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4">
                          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">Request Details</p>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {getRequestDetailEntries(doc).map(([label, value]) => (
                              <div key={`${doc._id}-${label}`}>
                                <dt className="text-[11px] font-semibold uppercase text-indigo-400">{label}</dt>
                                <dd className="text-indigo-900 break-words">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <input type="text" placeholder="Add a note (optional)" className="flex-1 border rounded-lg p-2 text-sm"
                          value={approvalNote} onChange={e => setApprovalNote(e.target.value)} />
                        <button onClick={() => handleApprove(doc._id, 'approved')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Approve
                        </button>
                        <button onClick={() => handleApprove(doc._id, 'rejected')}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1">
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERNSHIP FORMS APPROVALS */}
          {activeTab === 'internship_forms' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Internship Forms</h2>
                <button
                  onClick={() => fetchInternshipForms()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  🔄 Refresh Forms
                </button>
              </div>
              {internshipForms.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <FileSignature size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No internship forms to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {internshipForms.map(form => (
                    <div key={form._id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 border-l-4 border-l-indigo-500">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{form.student?.name} <span className="text-sm font-normal text-gray-500">({form.student?.branch})</span></h3>
                          <p className="text-sm text-gray-600 mt-1"><span className="font-semibold">{form.companyName}</span> • {form.role}</p>
                          <p className="text-xs text-gray-500 mt-1">Stipend: {form.stipend} | Duration: {form.internshipPeriod} | Joining: {new Date(form.joiningDate).toLocaleDateString()}</p>
                          <div className="mt-2">
                            {form.student?.offerLetterUrl ? (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleViewOfferLetter(form.student?._id, form.student?.offerLetterName)}
                                  className="text-left text-xs font-semibold text-indigo-600 underline"
                                >
                                  View Offer Letter
                                </button>
                                {form.student?.offerLetterHash && (
                                  <span className="text-xs text-gray-500 font-mono">
                                    Verify Hash: {form.student.offerLetterHash.substring(0, 8).toUpperCase()}...
                                  </span>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-amber-600 font-medium">Offer letter not uploaded yet</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${form.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {form.status}
                        </span>
                      </div>

                      {form.extraDetails && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg mb-4">
                          <span className="font-semibold">Extra Details:</span> {form.extraDetails}
                        </div>
                      )}

                      {form.status === 'pending' ? (
                        <div className="flex items-center gap-4 mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-indigo-900 uppercase tracking-widest mb-2">Assign Internal Guide</label>
                            <select
                              className="w-full border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                              value={selectedGuide[form._id] || ''}
                              onChange={(e) => setSelectedGuide({ ...selectedGuide, [form._id]: e.target.value })}
                            >
                              <option value="">-- Select Guide --</option>
                              {guides.map(g => (
                                <option key={g._id} value={g._id}>{g.name} ({g.department})</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleApproveInternship(form._id)}
                            className="bg-indigo-600 text-white px-6 py-2.5 flexitems-center justify-center rounded-lg text-sm font-bold tracking-wide hover:bg-indigo-700 transition-colors mt-6 whitespace-nowrap"
                          >
                            <CheckCircle2 size={16} className="inline mr-2" /> Approve & Assign
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 text-sm bg-green-50 p-3 rounded-lg border border-green-100">
                          <span className="font-medium text-green-800">Assigned Guide:</span> {form.internalGuide?.name} ({form.internalGuide?.email})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENT APPLICATIONS TAB */}
          {activeTab === 'applications' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Applications</h2>
              {applications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No student applications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app._id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{app.studentId?.name || 'Student'}</h3>
                          <p className="text-sm text-gray-500">{app.studentId?.email}</p>
                          <p className="text-sm text-gray-700 mt-2">
                            <span className="font-medium">{app.company || app.jobId?.company || 'Company'}</span> - {app.jobTitle || app.jobId?.title || 'Role'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                            app.mentorApproval?.approved ? 'bg-green-100 text-green-700' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            app.status === 'selected' ? 'bg-green-100 text-green-700' :
                            app.status === 'applied'  ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {app.mentorApproval?.approved ? 'Mentor Approved' : app.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                       {/* Approval Action */}
                      {!app.mentorApproval?.approved && app.mentorApproval?.status !== 'rejected' && app.status === 'applied' && (
                        <div className={`mt-4 p-3 border rounded-lg ${ appActionId === app._id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                          {appActionId === app._id ? (
                            <div className="space-y-3">
                              <textarea 
                                placeholder="Add a note for the recruiter (optional)"
                                className="w-full border rounded-lg p-2 text-sm resize-none"
                                rows="2"
                                value={appApprovalNote}
                                onChange={(e) => setAppApprovalNote(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleMentorApproveApplication(app._id)}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1"
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleMentorRejectApplication(app._id)}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                                <button
                                  onClick={() => { setAppActionId(null); setAppApprovalNote(''); }}
                                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAppActionId(app._id)}
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                            >
                              <CheckCircle2 size={14} /> Review Application
                            </button>
                          )}
                        </div>
                      )}

                      {/* Mentor Approval Status */}
                      {app.mentorApproval?.approved && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-700">✓ Approved by you on {new Date(app.mentorApproval.approvedAt).toLocaleDateString()}</p>
                          {app.mentorApproval.mentorNote && (
                            <p className="text-xs text-green-600 mt-1">Note: {app.mentorApproval.mentorNote}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Students</h2>
                <button
                  onClick={() => { fetchStudents(); fetchInterviewStudents(); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  🔄 Refresh Students
                </button>
              </div>
              {students.length === 0 ? (
                <p className="text-gray-500">No students registered in your department yet.</p>
              ) : (
                <div className="space-y-4">
                  {interviewError && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Error loading interviews:</strong> {interviewError}
                      </p>
                      <p className="text-xs text-red-700 mt-2">
                        Check browser console (F12) for details. Verify your mentor account has department assigned.
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Total Students:</strong> {students.length} | <strong>Scheduled Interviews:</strong> {interviewStudents.length}
                    </p>
                  </div>

                  <h3 className="font-semibold text-gray-700">Department Students</h3>
                  <p className="text-xs text-gray-400 mb-2">Showing {students.length} students - Scheduled interviews: {interviewStudents.length}</p>

                  {students.map((s) => {
                    const studentInterviews = getStudentInterviews(s._id);

                    return (
                      <div key={s._id} className="p-4 bg-white rounded-lg shadow-sm">
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-sm text-gray-500">{s.email}</p>

                        <div className="mt-2">
                          {s.offerLetterUrl ? (
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => handleViewOfferLetter(s._id, s.offerLetterName)}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 underline text-left"
                              >
                                <FileText size={12} /> View Offer Letter
                              </button>
                              {s.offerLetterHash && (
                                <span className="text-xs text-gray-500 font-mono">
                                  Verify Hash: {s.offerLetterHash.substring(0, 8).toUpperCase()}...
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 font-medium">Offer letter not uploaded yet</p>
                          )}
                        </div>

                        {studentInterviews.length > 0 ? (
                          <div className="mt-4 border-t pt-3 space-y-3">
                            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                              Scheduled Interviews ({studentInterviews.length})
                            </p>

                            {studentInterviews.map((app) => (
                              <div key={app._id} className="text-sm text-gray-700 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                <p>
                                  <span className="font-semibold">Company:</span> {app.jobId?.company || 'N/A'}
                                </p>
                                <p>
                                  <span className="font-semibold">Role:</span> {app.jobId?.title || 'N/A'}
                                </p>
                                <p>
                                  <span className="font-semibold">Date:</span> {formatInterviewDate(app.interview?.date)}
                                </p>
                                <p>
                                  <span className="font-semibold">Time:</span> {app.interview?.time || 'Time not set'}
                                </p>
                                <p>
                                  <span className="font-semibold">Mode:</span> {app.interview?.mode || 'Mode not set'}
                                </p>

                                {app.interview?.mode === 'online' && app.interview?.meetingLink && (
                                  <a
                                    href={app.interview.meetingLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 underline"
                                  >
                                    Join Meeting
                                  </a>
                                )}

                                {app.interview?.mode === 'offline' && app.interview?.location && (
                                  <p>
                                    <span className="font-semibold">Location:</span> {app.interview.location}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-2">No scheduled interviews</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
    <div className={`${color} p-3 rounded-xl text-white`}><Icon size={24} /></div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default MentorDashboard;
