import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { validateProfilePayload } from '../utils/profileValidation';
import {
  FileCheck, CheckCircle2, XCircle, LayoutDashboard, ArrowRight,
  AlertCircle, Award, BarChart3, Clock, Shield, Users, Download, Filter,
  Zap, TrendingUp, Trash2, UserCircle2,
} from 'lucide-react';

const DeanDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docNotes, setDocNotes] = useState({});
  const [sharedReports, setSharedReports] = useState([]);
  const [sharedReportsLoading, setSharedReportsLoading] = useState(false);
  const [sharedReportsError, setSharedReportsError] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Filters
  const [filterDocType, setFilterDocType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState('all');
  const [pipelineOrgFilter, setPipelineOrgFilter] = useState('all');
  const [deletingInterviewId, setDeletingInterviewId] = useState('');
  
  // Bulk operations
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  
  // Analytics
  const [analytics, setAnalytics] = useState({
    totalApprovals: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    avgTurnaroundTime: 0,
    deptBreakdown: {},
  });
  
  // Shared Reports
  const [expandedReport, setExpandedReport] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    designation: '',
    universityName: '',
    officeContact: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchPendingDocs();
    fetchApplications();
    fetchSharedReports();
    fetchDeanAnalytics();
    fetchMyProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyProfile = async () => {
    try {
      const res = await axios.get('/api/profile');
      const data = res.data || {};
      setProfileForm({
        name: data.name || user?.name || '',
        email: data.email || user?.email || '',
        phone: data.phone || data.contact || '',
        bio: data.bio || '',
        designation: data.designation || '',
        universityName: data.universityName || '',
        officeContact: data.officeContact || '',
        linkedinUrl: data.linkedinUrl || data.linkedin || '',
        githubUrl: data.githubUrl || data.github || '',
        portfolioUrl: data.portfolioUrl || '',
      });
    } catch (err) {
      console.error('Failed to fetch dean profile', err);
    }
  };

  const saveMyProfile = async (e) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileFeedback({ type: '', message: '' });
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone,
        bio: profileForm.bio,
        designation: profileForm.designation,
        universityName: profileForm.universityName,
        officeContact: profileForm.officeContact,
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

  const fetchPendingDocs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/documents/pending');
      setPendingDocs(res.data.documents);
    } catch (err) {
      console.error('Failed to fetch documents', err);
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

  const fetchSharedReports = async () => {
    setSharedReportsLoading(true);
    setSharedReportsError('');
    try {
      const res = await axios.get('/api/review-schedule/shared-reports/list');
      setSharedReports(res.data.reports || []);
    } catch (err) {
      setSharedReportsError(err.response?.data?.message || 'Failed to fetch shared reports');
      setSharedReports([]);
    } finally {
      setSharedReportsLoading(false);
    }
  };

  const fetchDeanAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await axios.get('/api/documents/analytics/dean');
      const data = res.data || {};
      const deptMap = (data.deptBreakdown || []).reduce((acc, item) => {
        acc[item.department] = item.count;
        return acc;
      }, {});
      setAnalytics({
        totalApprovals: data.totalApprovals || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
        pending: data.pending || 0,
        avgTurnaroundTime: data.avgTurnaroundTime || 0,
        deptBreakdown: deptMap,
      });
    } catch (err) {
      setAnalytics((prev) => ({ ...prev, deptBreakdown: {} }));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getDaysPending = (createdAt) => {
    const days = Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    return days;
  };

  const isOverSLA = (createdAt) => getDaysPending(createdAt) > 7;

  const handleSelectDoc = (docId) => {
    const updated = new Set(selectedDocs);
    if (updated.has(docId)) {
      updated.delete(docId);
    } else {
      updated.add(docId);
    }
    setSelectedDocs(updated);
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === getFilteredDocs().length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(getFilteredDocs().map(d => d._id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.size === 0) {
      alert('Please select documents to approve');
      return;
    }
    try {
      setBulkActionInProgress(true);
      await Promise.all(
        Array.from(selectedDocs).map(docId =>
          axios.put(`/api/documents/${docId}/approve`, {
            decision: 'approved',
            note: 'Bulk approved by Dean',
          })
        )
      );
      setSelectedDocs(new Set());
      fetchPendingDocs();
      fetchDeanAnalytics();
      alert(`${selectedDocs.size} documents approved successfully`);
    } catch (err) {
      alert('Failed to bulk approve: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedDocs.size === 0) {
      alert('Please select documents to reject');
      return;
    }
    const reason = prompt('Enter rejection reason (required):');
    if (!reason || !reason.trim()) {
      alert('Rejection reason is required');
      return;
    }
    try {
      setBulkActionInProgress(true);
      await Promise.all(
        Array.from(selectedDocs).map(docId =>
          axios.put(`/api/documents/${docId}/approve`, {
            decision: 'rejected',
            note: reason,
          })
        )
      );
      setSelectedDocs(new Set());
      fetchPendingDocs();
      fetchDeanAnalytics();
      alert(`${selectedDocs.size} documents rejected successfully`);
    } catch (err) {
      alert('Failed to bulk reject: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkActionInProgress(false);
    }
  };

  const getDocType = (doc) => doc?.documentType || doc?.type || 'N/A';

  const exportToCSV = (docs, fileTag = 'all') => {
    if (docs.length === 0) {
      alert('No documents to export');
      return;
    }

    const headers = ['Student Name', 'Email', 'Document Type', 'Days Pending', 'Status', 'Mentor Approval', 'HOD Approval', 'Dean Status'];
    const rows = docs.map(doc => [
      doc.studentId?.name || 'N/A',
      doc.studentId?.email || 'N/A',
      getDocType(doc),
      getDaysPending(doc.createdAt),
      doc.overallStatus || 'N/A',
      doc.mentorApproval?.status || 'pending',
      doc.hodApproval?.status || 'pending',
      doc.deanApproval?.status || 'pending',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dean-approvals-${fileTag}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFilteredDocs = () => {
    exportToCSV(getFilteredDocs(), 'all');
  };

  const exportSelectedDocs = () => {
    const selectedList = getFilteredDocs().filter((doc) => selectedDocs.has(doc._id));
    exportToCSV(selectedList, 'selected');
  };

  const handleApprove = async (docId, action) => {
    try {
      const note = docNotes[docId] || '';
      if (action === 'rejected' && !note.trim()) {
        alert('Rejection reason is required. Please add a note.');
        return;
      }
      await axios.put(`/api/documents/${docId}/approve`, {
        decision: action,
        note: note,
      });
      setDocNotes(prev => {
        const updated = { ...prev };
        delete updated[docId];
        return updated;
      });
      fetchPendingDocs();
      fetchDeanAnalytics();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'my_profile', label: 'My Profile', icon: UserCircle2 },
    { key: 'selected-students', label: 'Selected Students', icon: Award },
    { key: 'approvals', label: 'Final Approvals', icon: FileCheck },
    { key: 'shared-reports', label: 'Shared Reports', icon: Download },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const selectedApplications = applications.filter(
    (app) => ['selected', 'offered', 'offer_accepted'].includes(app.status)
  );

  const pipelineApplications = applications.filter(
    (app) => ['shortlisted', 'selected', 'offered', 'offer_accepted'].includes(app.status)
  );

  const scheduledInterviews = applications.filter(
    (app) =>
      app.status === 'interview_scheduled' ||
      app.interviewScheduled ||
      app.interview?.date
  );

  const getOrganization = (app) => app?.jobId?.company || app?.company || 'N/A';
  const getRoleName = (app) => app?.jobId?.title || app?.jobTitle || 'N/A';
  const getJoiningDate = (app) => app?.joiningDate || app?.offerAcceptedAt || app?.startDate || app?.offerDeadline || app?.interview?.date || null;
  const getJoiningStatus = (app) => app?.joiningStatus || (app?.status === 'offer_accepted' ? 'joined' : 'pending');
  const getOrganizationName = (app) => app?.organizationName || getOrganization(app);
  const getJoiningLocation = (app) => app?.joiningLocation || app?.location || app?.jobId?.location || 'N/A';
  const formatDate = (value) => {
    if (!value) return 'N/A';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return 'N/A';
    return dt.toLocaleDateString();
  };

  const formatInterviewDate = (dateValue) => {
    if (!dateValue) return 'Date not set';
    return new Date(dateValue).toLocaleDateString();
  };

  // Filter documents based on filter criteria
  const getFilteredDocs = () => {
    return pendingDocs.filter(doc => {
      const docType = getDocType(doc).toLowerCase();
      const docTypeMatch = !filterDocType || docType.includes(filterDocType.toLowerCase());
      const deptMatch = !filterDepartment || doc.studentId?.department === filterDepartment;
      const searchMatch = !filterSearch || 
        doc.studentId?.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
        doc.studentId?.email?.toLowerCase().includes(filterSearch.toLowerCase());
      
      let dateMatch = true;
      if (filterDateFrom || filterDateTo) {
        const docDate = new Date(doc.createdAt);
        if (filterDateFrom) dateMatch = dateMatch && docDate >= new Date(filterDateFrom);
        if (filterDateTo) {
          const toEnd = new Date(filterDateTo);
          toEnd.setHours(23, 59, 59, 999);
          dateMatch = dateMatch && docDate <= toEnd;
        }
      }
      
      return docTypeMatch && deptMatch && searchMatch && dateMatch;
    });
  };

  const departmentOptions = [...new Set(
    pendingDocs
      .map((doc) => doc.studentId?.department)
      .filter(Boolean)
  )].sort();

  const pipelineOrganizations = [...new Set(
    pipelineApplications
      .map((app) => getOrganizationName(app))
      .filter((org) => org && org !== 'N/A')
  )].sort();

  const filteredPipelineApplications = pipelineApplications.filter((app) => {
    const statusMatch = pipelineStatusFilter === 'all' || app.status === pipelineStatusFilter;
    const orgMatch = pipelineOrgFilter === 'all' || getOrganizationName(app) === pipelineOrgFilter;
    const text = pipelineSearch.trim().toLowerCase();
    const searchMatch = !text
      || app?.studentId?.name?.toLowerCase().includes(text)
      || app?.studentId?.email?.toLowerCase().includes(text)
      || getOrganizationName(app).toLowerCase().includes(text)
      || getRoleName(app).toLowerCase().includes(text);
    return statusMatch && orgMatch && searchMatch;
  });

  const exportPipelineCsv = () => {
    if (!filteredPipelineApplications.length) {
      alert('No pipeline records to export');
      return;
    }

    const headers = [
      'Student Name',
      'Email',
      'Status',
      'Role',
      'Organization',
      'Joining Date',
      'Joining Status',
      'Joining Location',
      'CTC',
      'Work Mode',
    ];

    const rows = filteredPipelineApplications.map((app) => [
      app?.studentId?.name || 'N/A',
      app?.studentId?.email || 'N/A',
      app?.status || 'N/A',
      getRoleName(app),
      getOrganizationName(app),
      formatDate(getJoiningDate(app)),
      getJoiningStatus(app),
      getJoiningLocation(app),
      app?.ctc || 'N/A',
      app?.workMode || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `placement-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeScheduledInterview = async (applicationId) => {
    const ok = window.confirm('Remove this scheduled interview from list?');
    if (!ok) return;

    try {
      setDeletingInterviewId(applicationId);
      await axios.put(`/api/applications/${applicationId}/cancel-interview`);
      await fetchApplications();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove scheduled interview');
    } finally {
      setDeletingInterviewId('');
    }
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
            <p className="text-sm text-gray-500">Dean</p>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Dean Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={FileCheck} label="Pending Final Approvals" value={pendingDocs.length} color="bg-yellow-500" />
                <StatCard icon={Users} label="Selected Students" value={selectedApplications.length} color="bg-green-500" />
                <StatCard icon={Clock} label="Scheduled Interviews" value={scheduledInterviews.length} color="bg-indigo-500" />
                <StatCard icon={Shield} label="Institution Applications" value={applications.length} color="bg-purple-500" />
              </div>

              {pendingDocs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-yellow-500" /> Documents Awaiting Final Approval
                  </h3>
                  {pendingDocs.slice(0, 5).map(doc => (
                    <div key={doc._id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{getDocType(doc)}</p>
                        <p className="text-sm text-gray-500">
                          Student: {doc.studentId?.name} • HOD Approved: {doc.hodApproval?.at ? new Date(doc.hodApproval.at).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <button onClick={() => setActiveTab('approvals')} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        Review <ArrowRight size={14} className="inline" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {scheduledInterviews.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-indigo-500" /> Scheduled Interviews
                  </h3>
                  {scheduledInterviews.slice(0, 8).map(app => (
                    <div key={app._id} className="py-3 border-b last:border-0 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">{app.studentId?.name || 'Student'}</p>
                        <p className="text-sm text-gray-500">
                          {app.jobId?.title || app.jobTitle || 'Role'} • {app.jobId?.company || app.company || 'Company'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatInterviewDate(app.interview?.date)} • {app.interview?.time || 'Time not set'} • {app.interview?.mode || 'Mode not set'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeScheduledInterview(app._id)}
                        disabled={deletingInterviewId === app._id}
                        className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        {deletingInterviewId === app._id ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingDocs.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my_profile' && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Dean Profile</h2>
                <p className="text-sm text-gray-500 mb-6">Update your profile details visible in institutional workflows.</p>
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
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Designation</label>
                      <input
                        type="text"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, designation: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">University Name</label>
                      <input
                        type="text"
                        value={profileForm.universityName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, universityName: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Office Contact</label>
                      <input
                        type="text"
                        value={profileForm.officeContact}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, officeContact: e.target.value }))}
                        className="w-full border rounded-lg p-2.5 text-sm"
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

          {/* SELECTED STUDENTS */}
          {activeTab === 'selected-students' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Placement Pipeline</h2>
              <p className="text-sm text-gray-500 mb-6">Shortlisted, selected, and offered students with organization and joining details.</p>
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={pipelineSearch}
                    onChange={(e) => setPipelineSearch(e.target.value)}
                    placeholder="Search name/email/organization/role"
                    className="border rounded-lg p-2 text-sm"
                  />
                  <select
                    value={pipelineStatusFilter}
                    onChange={(e) => setPipelineStatusFilter(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="selected">Selected</option>
                    <option value="offered">Offered</option>
                    <option value="offer_accepted">Offer Accepted</option>
                  </select>
                  <select
                    value={pipelineOrgFilter}
                    onChange={(e) => setPipelineOrgFilter(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  >
                    <option value="all">All Organizations</option>
                    {pipelineOrganizations.map((org) => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                  <button
                    onClick={exportPipelineCsv}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Export Pipeline CSV
                  </button>
                </div>
              </div>

              {filteredPipelineApplications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Award size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No shortlisted/selected students yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="space-y-3">
                    {filteredPipelineApplications.map((app) => (
                      <div key={app._id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{app.studentId?.name || 'Student'}</p>
                            <p className="text-sm text-gray-500">{app.studentId?.email || 'No email'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Role: {getRoleName(app)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Organization: {getOrganizationName(app)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Joining Date: {formatDate(getJoiningDate(app))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Joining Status: {getJoiningStatus(app)} • Location: {getJoiningLocation(app)}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            app.status === 'shortlisted'
                              ? 'bg-blue-100 text-blue-700'
                              : app.status === 'offer_accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : app.status === 'offered'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                          }`}>
                            {app.status === 'offer_accepted'
                              ? 'Offer Accepted'
                              : app.status === 'offered'
                                ? 'Offered'
                                : app.status === 'shortlisted'
                                  ? 'Shortlisted'
                                  : 'Selected'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FINAL APPROVALS */}
          {activeTab === 'approvals' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Final Document Approvals</h2>
              
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter size={18} className="text-gray-600" />
                  <h3 className="font-semibold text-gray-700">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <input
                    type="text"
                    placeholder="Search student name/email"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <select
                    value={filterDocType}
                    onChange={(e) => setFilterDocType(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  >
                    <option value="">All Document Types</option>
                    <option value="noc">NOC</option>
                    <option value="bonafide">Bonafide</option>
                    <option value="lor">LOR</option>
                  </select>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  >
                    <option value="">All Departments</option>
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    placeholder="From Date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <input
                    type="date"
                    placeholder="To Date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      setFilterSearch('');
                      setFilterDocType('');
                      setFilterDepartment('');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-400"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : getFilteredDocs().length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">All clear — no documents pending</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk Actions Bar */}
                  {selectedDocs.size > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedDocs.size === getFilteredDocs().length && getFilteredDocs().length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium text-blue-800">{selectedDocs.size} selected</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleBulkApprove}
                          disabled={bulkActionInProgress}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                        >
                          Bulk Approve
                        </button>
                        <button
                          onClick={handleBulkReject}
                          disabled={bulkActionInProgress}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                        >
                          Bulk Reject
                        </button>
                        <button
                          onClick={exportSelectedDocs}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
                        >
                          Export Selected
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Export All Button */}
                  <div className="mb-4">
                    <button
                      onClick={exportFilteredDocs}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700"
                    >
                      <Download size={14} /> Export All to CSV
                    </button>
                  </div>

                  {/* SLA Alerts */}
                  {getFilteredDocs().some(d => isOverSLA(d.createdAt)) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Zap size={18} className="text-red-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-800">SLA Alert</p>
                          <p className="text-sm text-red-700 mt-1">
                            {getFilteredDocs().filter(d => isOverSLA(d.createdAt)).length} document(s) pending for more than 7 days
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approvals List */}
                  <div className="space-y-4">
                    {getFilteredDocs().map(doc => (
                      <div key={doc._id} className={`rounded-xl shadow-sm p-6 ${isOverSLA(doc.createdAt) ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedDocs.has(doc._id)}
                            onChange={() => handleSelectDoc(doc._id)}
                            className="w-4 h-4 mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-800">{getDocType(doc)}</h3>
                                <p className="text-sm text-gray-500">
                                  Student: {doc.studentId?.name} • Department: {doc.studentId?.department}
                                </p>
                                <p className="text-xs text-red-600 font-medium mt-1">
                                  {getDaysPending(doc.createdAt)} days pending
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                Final Review
                              </span>
                            </div>

                            {/* Approval Timeline */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <p className="text-xs font-semibold text-gray-600 mb-3">APPROVAL TIMELINE</p>
                              <div className="flex items-center gap-1 text-xs">
                                <div className={`flex items-center gap-1 px-2 py-1 rounded ${doc.mentorApproval?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  <CheckCircle2 size={12} /> Mentor
                                  {doc.mentorApproval?.at && <span className="text-xs ml-1">({new Date(doc.mentorApproval.at).toLocaleDateString()})</span>}
                                </div>
                                <div className="text-gray-400">→</div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded ${doc.hodApproval?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  <CheckCircle2 size={12} /> HOD
                                  {doc.hodApproval?.at && <span className="text-xs ml-1">({new Date(doc.hodApproval.at).toLocaleDateString()})</span>}
                                </div>
                                <div className="text-gray-400">→</div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                                  <Clock size={12} /> Dean (Pending)
                                </div>
                              </div>
                            </div>

                            {doc.purpose && (
                              <p className="text-sm text-gray-600 bg-white p-3 rounded-lg mb-4 border">{doc.purpose}</p>
                            )}

                            {/* Previous notes */}
                            <div className="space-y-2 mb-4">
                              {doc.mentorApproval?.note && (
                                <div className="bg-blue-50 p-2 rounded-lg text-sm">
                                  <span className="font-medium text-blue-600">Mentor:</span> {doc.mentorApproval.note}
                                </div>
                              )}
                              {doc.hodApproval?.note && (
                                <div className="bg-purple-50 p-2 rounded-lg text-sm">
                                  <span className="font-medium text-purple-600">HOD:</span> {doc.hodApproval.note}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <textarea
                                placeholder="Add a note (required for rejection)"
                                className="flex-1 border rounded-lg p-2 text-sm"
                                rows="2"
                                value={docNotes[doc._id] || ''}
                                onChange={(e) => setDocNotes(prev => ({ ...prev, [doc._id]: e.target.value }))}
                              />
                              <div className="flex gap-2 flex-col">
                                <button
                                  onClick={() => handleApprove(doc._id, 'approved')}
                                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                <button
                                  onClick={() => handleApprove(doc._id, 'rejected')}
                                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1 whitespace-nowrap"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SHARED REPORTS */}
          {activeTab === 'shared-reports' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Shared Attendance Reports</h2>
              {sharedReportsLoading ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-gray-500">Loading shared reports...</p>
                </div>
              ) : sharedReportsError ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-red-600 mb-4">{sharedReportsError}</p>
                  <button
                    onClick={fetchSharedReports}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Retry
                  </button>
                </div>
              ) : sharedReports.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Download size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No shared attendance reports yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sharedReports.map((report) => (
                    <div key={report._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {/* Report Header */}
                      <div
                        className="p-6 border-b cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-800">Attendance Report</h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {report.filterMode === 'all' ? 'All Attendance' : `Date: ${report.filterDate}`}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Shared by: {report.sharedBy?.name} • {new Date(report.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-gray-800">{report.summary?.total || 0}</p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">{report.summary?.present || 0}</p>
                              <p className="text-xs text-gray-500">Present</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-red-600">{report.summary?.absent || 0}</p>
                              <p className="text-xs text-gray-500">Absent</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attendance Details Table */}
                      {expandedReport === report._id && (
                        <div className="p-6 border-t">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-gray-50">
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(report.attendanceDetails || []).map((record, idx) => (
                                  <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-800">{record.studentName || 'N/A'}</td>
                                    <td className="px-4 py-3 text-gray-600">{record.studentEmail || 'N/A'}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                          record.status === 'present'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {record.status?.toUpperCase()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {(!report.attendanceDetails || report.attendanceDetails.length === 0) && (
                            <p className="text-center text-gray-500 py-4">No attendance records</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Institution Analytics</h2>
              {analyticsLoading && <p className="text-sm text-gray-500 mb-4">Refreshing analytics...</p>}
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={FileCheck} label="Total Processed" value={analytics.totalApprovals} color="bg-blue-500" />
                <StatCard icon={CheckCircle2} label="Approved" value={analytics.approved} color="bg-green-500" />
                <StatCard icon={XCircle} label="Rejected" value={analytics.rejected} color="bg-red-500" />
                <StatCard icon={Clock} label="Pending" value={analytics.pending} color="bg-yellow-500" />
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <p className="text-sm text-gray-600">
                  Avg Turnaround Time: <span className="font-semibold text-gray-800">{analytics.avgTurnaroundTime} days</span>
                </p>
              </div>

              {/* Department Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-600" /> Department Breakdown
                </h3>
                <div className="space-y-3">
                  {Object.entries(analytics.deptBreakdown).length === 0 ? (
                    <p className="text-gray-500">No data yet</p>
                  ) : (
                    Object.entries(analytics.deptBreakdown).map(([dept, count]) => (
                      <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-700">{dept}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-48 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{
                                width: `${(count / Math.max(...Object.values(analytics.deptBreakdown))) * 100}%`
                              }}
                            />
                          </div>
                          <span className="font-semibold text-gray-800 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Approval Efficiency */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-600" /> Approval Efficiency
                </h3>
                {analytics.totalApprovals === 0 ? (
                  <p className="text-gray-500">No approval data yet</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Approval Rate</span>
                        <span className="text-sm font-bold text-green-600">
                          {analytics.totalApprovals > 0 ? Math.round((analytics.approved / analytics.totalApprovals) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${analytics.totalApprovals > 0 ? (analytics.approved / analytics.totalApprovals) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Rejection Rate</span>
                        <span className="text-sm font-bold text-red-600">
                          {analytics.totalApprovals > 0 ? Math.round((analytics.rejected / analytics.totalApprovals) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{
                            width: `${analytics.totalApprovals > 0 ? (analytics.rejected / analytics.totalApprovals) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

export default DeanDashboard;
