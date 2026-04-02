import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { validateProfilePayload } from '../utils/profileValidation';
import {
  FileCheck, CheckCircle2, XCircle, LayoutDashboard, ArrowRight,
  AlertCircle, Users, BarChart3, Building, Clock, Filter, Download,
  UserCircle2,
} from 'lucide-react';

const HODDashboard = () => {
  const { user } = useAuth();
  const rejectionTemplates = [
    'Missing mandatory fields',
    'Missing authorized signature/stamp',
    'Invalid or mismatched dates',
    'Unsupported document format',
    'Insufficient supporting details',
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [sharedReports, setSharedReports] = useState([]);
  const [sharedReportsLoading, setSharedReportsLoading] = useState(false);
  const [sharedReportsError, setSharedReportsError] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  const [sharedFromDate, setSharedFromDate] = useState('');
  const [sharedToDate, setSharedToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [docNotes, setDocNotes] = useState({});
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [bulkNote, setBulkNote] = useState('');
  const [bulkDecision, setBulkDecision] = useState('approved');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    department: '',
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
        designation: data.designation || '',
        universityName: data.universityName || '',
        officeContact: data.officeContact || '',
        linkedinUrl: data.linkedinUrl || data.linkedin || '',
        githubUrl: data.githubUrl || data.github || '',
        portfolioUrl: data.portfolioUrl || '',
      });
    } catch (err) {
      console.error('Failed to fetch HOD profile', err);
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

  const handleApprove = async (docId, action) => {
    try {
      const note = docNotes[docId] || '';
      if (action === 'rejected' && !note.trim()) {
        alert('Rejection reason is required. Please add a note.');
        return;
      }
      await axios.put(`/api/documents/${docId}/approve`, {
        decision: action,
        note,
      });
      setDocNotes((prev) => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      fetchPendingDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const getSlaMeta = (createdAt) => {
    if (!createdAt) return { hours: 0, tag: 'new', label: 'New', className: 'bg-gray-100 text-gray-700' };
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const hours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

    if (hours >= 72) {
      return { hours, tag: 'critical', label: `${hours}h (Critical)`, className: 'bg-red-100 text-red-700' };
    }
    if (hours >= 48) {
      return { hours, tag: 'overdue', label: `${hours}h (Overdue)`, className: 'bg-amber-100 text-amber-700' };
    }
    if (hours >= 24) {
      return { hours, tag: 'due-soon', label: `${hours}h (Due Soon)`, className: 'bg-yellow-100 text-yellow-700' };
    }
    return { hours, tag: 'new', label: `${hours}h`, className: 'bg-green-100 text-green-700' };
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'my_profile', label: 'My Profile', icon: UserCircle2 },
    { key: 'approvals', label: 'Approvals', icon: FileCheck },
    { key: 'selected-students', label: 'Selected Students', icon: CheckCircle2 },
    { key: 'shared-reports', label: 'Shared Reports', icon: Download },
    { key: 'department', label: 'Department', icon: Building },
  ];

  const selectedApplications = applications.filter(
    (app) => app.status === 'selected' || app.status === 'offered'
  );

  const scheduledInterviews = applications.filter(
    (app) =>
      app.status === 'interview_scheduled' ||
      app.interviewScheduled ||
      app.interview?.date
  );

  const formatInterviewDate = (dateValue) => {
    if (!dateValue) return 'Date not set';
    return new Date(dateValue).toLocaleDateString();
  };

  const getDocType = (doc) => doc?.documentType || doc?.type || 'N/A';

  const getFilteredPendingDocs = () => {
    return pendingDocs.filter((doc) => {
      const docType = getDocType(doc).toLowerCase();
      const search = filterSearch.trim().toLowerCase();
      const searchMatch = !search
        || doc?.studentId?.name?.toLowerCase().includes(search)
        || doc?.studentId?.email?.toLowerCase().includes(search);
      const typeMatch = !filterDocType || docType.includes(filterDocType.toLowerCase());

      let dateMatch = true;
      if (filterDateFrom || filterDateTo) {
        const createdAt = new Date(doc.createdAt);
        if (filterDateFrom) dateMatch = dateMatch && createdAt >= new Date(filterDateFrom);
        if (filterDateTo) {
          const toEnd = new Date(filterDateTo);
          toEnd.setHours(23, 59, 59, 999);
          dateMatch = dateMatch && createdAt <= toEnd;
        }
      }

      return searchMatch && typeMatch && dateMatch;
    });
  };

  const toggleDocSelection = (docId) => {
    setSelectedDocIds((prev) => (
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    ));
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = getFilteredPendingDocs().map((doc) => doc._id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedDocIds.includes(id));
    if (allSelected) {
      setSelectedDocIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedDocIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleBulkAction = async () => {
    const filteredDocs = getFilteredPendingDocs();
    const selectedDocs = filteredDocs.filter((doc) => selectedDocIds.includes(doc._id));
    if (!selectedDocs.length) {
      alert('Select at least one document');
      return;
    }

    const noteToSend = bulkNote.trim();
    if (bulkDecision === 'rejected' && !noteToSend) {
      alert('Rejection reason is required for bulk reject');
      return;
    }

    try {
      setBulkLoading(true);
      const requests = selectedDocs.map((doc) => axios.put(`/api/documents/${doc._id}/approve`, {
        decision: bulkDecision,
        note: noteToSend,
      }));
      const results = await Promise.allSettled(requests);
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      const successCount = results.length - failedCount;

      if (failedCount > 0) {
        alert(`${successCount} updated, ${failedCount} failed`);
      }

      setSelectedDocIds([]);
      setBulkNote('');
      await fetchPendingDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const exportApprovalsCsv = () => {
    const rows = getFilteredPendingDocs();
    if (!rows.length) {
      alert('No approvals to export');
      return;
    }

    const headers = ['Student Name', 'Email', 'Document Type', 'Overall Status', 'Mentor Status', 'Requested On', 'SLA'];
    const data = rows.map((doc) => [
      doc?.studentId?.name || 'N/A',
      doc?.studentId?.email || 'N/A',
      getDocType(doc),
      doc?.overallStatus || 'N/A',
      doc?.mentorApproval?.status || 'pending',
      doc?.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'N/A',
      getSlaMeta(doc?.createdAt).label,
    ]);

    const csv = [headers.join(','), ...data.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hod-approvals-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shortlistedCount = applications.filter((app) => app.status === 'shortlisted').length;
  const selectedCount = applications.filter((app) => ['selected', 'offered', 'offer_accepted'].includes(app.status)).length;
  const interviewCount = applications.filter((app) => app.status === 'interview_scheduled' || app.interviewScheduled).length;
  const overdueApprovalsCount = pendingDocs.filter((doc) => getSlaMeta(doc?.createdAt).tag === 'overdue' || getSlaMeta(doc?.createdAt).tag === 'critical').length;
  const topOrganizations = Object.entries(
    applications.reduce((acc, app) => {
      const company = app?.jobId?.company || app?.company;
      if (!company) return acc;
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const getFilteredSharedReports = () => {
    return sharedReports.filter((report) => {
      if (!sharedFromDate && !sharedToDate) return true;
      const createdAt = new Date(report.createdAt);
      let match = true;
      if (sharedFromDate) match = match && createdAt >= new Date(sharedFromDate);
      if (sharedToDate) {
        const toEnd = new Date(sharedToDate);
        toEnd.setHours(23, 59, 59, 999);
        match = match && createdAt <= toEnd;
      }
      return match;
    });
  };

  const exportSharedReportsCsv = () => {
    const reports = getFilteredSharedReports();
    if (!reports.length) {
      alert('No shared reports to export');
      return;
    }

    const headers = [
      'Report Shared At',
      'Shared By',
      'Filter Mode',
      'Filter Date',
      'Total',
      'Present',
      'Absent',
      'Student Name',
      'Student Email',
      'Attendance Status',
    ];

    const rows = [];
    reports.forEach((report) => {
      const details = report.attendanceDetails || [];
      if (!details.length) {
        rows.push([
          new Date(report.createdAt).toLocaleString(),
          report.sharedBy?.name || report.sharedByName || 'Internal Guide',
          report.filterMode || 'N/A',
          report.filterDate || 'N/A',
          report.summary?.total || 0,
          report.summary?.present || 0,
          report.summary?.absent || 0,
          'N/A',
          'N/A',
          'N/A',
        ]);
        return;
      }

      details.forEach((item) => {
        rows.push([
          new Date(report.createdAt).toLocaleString(),
          report.sharedBy?.name || report.sharedByName || 'Internal Guide',
          report.filterMode || 'N/A',
          report.filterDate || 'N/A',
          report.summary?.total || 0,
          report.summary?.present || 0,
          report.summary?.absent || 0,
          item.studentName || 'N/A',
          item.studentEmail || 'N/A',
          item.status || 'N/A',
        ]);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hod-shared-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
            <p className="text-sm text-gray-500">Head of Department</p>
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">HOD Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <StatCard icon={FileCheck} label="Pending Approvals" value={pendingDocs.length} color="bg-yellow-500" />
                <StatCard icon={Users} label="Selected Students" value={selectedApplications.length} color="bg-green-500" />
                <StatCard icon={Clock} label="Scheduled Interviews" value={scheduledInterviews.length} color="bg-indigo-500" />
                <StatCard icon={BarChart3} label="Overdue Approvals" value={overdueApprovalsCount} color="bg-red-500" />
              </div>

              {pendingDocs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-yellow-500" /> Documents Awaiting Your Approval
                  </h3>
                  {pendingDocs.slice(0, 5).map(doc => (
                    <div key={doc._id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{getDocType(doc)}</p>
                        <p className="text-sm text-gray-500">
                          Student: {doc.studentId?.name} • Mentor Approved: {doc.mentorApproval?.at ? new Date(doc.mentorApproval.at).toLocaleDateString() : '-'}
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
                  {scheduledInterviews.slice(0, 6).map((app) => (
                    <div key={app._id} className="py-3 border-b last:border-0">
                      <p className="font-medium text-gray-800">{app.studentId?.name || 'Student'}</p>
                      <p className="text-sm text-gray-500">
                        {app.jobId?.title || app.jobTitle || 'Role'} • {app.jobId?.company || app.company || 'Company'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatInterviewDate(app.interview?.date)} • {app.interview?.time || 'Time not set'} • {app.interview?.mode || 'Mode not set'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {pendingDocs.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">All caught up! No pending approvals.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my_profile' && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">HOD Profile</h2>
                <p className="text-sm text-gray-500 mb-6">Update your profile details visible in approval workflow.</p>
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

          {/* SELECTED STUDENTS TAB */}
          {activeTab === 'selected-students' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Selected Students</h2>
              {selectedApplications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No selected students yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="space-y-3">
                    {selectedApplications.map((app) => (
                      <div key={app._id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{app.studentId?.name || 'Student'}</p>
                            <p className="text-sm text-gray-500">{app.studentId?.email || 'No email'}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {app.jobId?.title || app.jobTitle || 'Role'} • {app.jobId?.company || app.company || 'Company'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            app.status === 'offered' || app.status === 'offer_accepted'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {app.status === 'offer_accepted' ? 'Offer Accepted' : app.status === 'offered' ? 'Offered' : 'Selected'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* APPROVALS */}
          {activeTab === 'approvals' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Document Approvals (HOD Level)</h2>
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter size={18} className="text-gray-600" />
                  <h3 className="font-semibold text-gray-700">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                    <option value="custom">LOR/Custom</option>
                  </select>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <button
                    onClick={exportApprovalsCsv}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700">
                    Critical (72h+): {pendingDocs.filter((doc) => getSlaMeta(doc?.createdAt).tag === 'critical').length}
                  </span>
                  <span className="px-2 py-1 rounded bg-amber-100 text-amber-700">
                    Overdue (48h+): {pendingDocs.filter((doc) => getSlaMeta(doc?.createdAt).tag === 'overdue').length}
                  </span>
                  <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                    Due Soon (24h+): {pendingDocs.filter((doc) => getSlaMeta(doc?.createdAt).tag === 'due-soon').length}
                  </span>
                </div>
              </div>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : getFilteredPendingDocs().length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No pending documents</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={(() => {
                              const filteredIds = getFilteredPendingDocs().map((doc) => doc._id);
                              return filteredIds.length > 0 && filteredIds.every((id) => selectedDocIds.includes(id));
                            })()}
                            onChange={toggleSelectAllFiltered}
                          />
                          Select all filtered
                        </label>
                        <span className="text-sm text-gray-500">Selected: {selectedDocIds.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={bulkDecision}
                          onChange={(e) => setBulkDecision(e.target.value)}
                          className="border rounded-lg p-2 text-sm"
                        >
                          <option value="approved">Bulk Approve</option>
                          <option value="rejected">Bulk Reject</option>
                        </select>
                        <input
                          value={bulkNote}
                          onChange={(e) => setBulkNote(e.target.value)}
                          placeholder={bulkDecision === 'rejected' ? 'Rejection reason (required)' : 'Optional note for all selected'}
                          className="border rounded-lg p-2 text-sm min-w-[240px]"
                        />
                        <button
                          onClick={handleBulkAction}
                          disabled={bulkLoading}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {bulkLoading ? 'Updating...' : 'Apply Bulk Action'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {getFilteredPendingDocs().map(doc => (
                    <div key={doc._id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">{getDocType(doc)}</h3>
                          <p className="text-sm text-gray-500">
                            Student: {doc.studentId?.name} • Status: {doc.overallStatus.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={selectedDocIds.includes(doc._id)}
                              onChange={() => toggleDocSelection(doc._id)}
                            />
                            Select
                          </label>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSlaMeta(doc.createdAt).className}`}>
                            SLA: {getSlaMeta(doc.createdAt).label}
                          </span>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            HOD Review
                          </span>
                        </div>
                      </div>

                      {/* Approval chain status */}
                      <div className="flex items-center gap-2 mb-4 text-xs">
                        <span className={`px-2 py-1 rounded ${doc.mentorApproval?.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          Mentor: {doc.mentorApproval?.status || 'pending'}
                        </span>
                        <span className="text-gray-300">→</span>
                        <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                          HOD: pending
                        </span>
                        <span className="text-gray-300">→</span>
                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-400">
                          Dean: waiting
                        </span>
                      </div>

                      {doc.purpose && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg mb-4">{doc.purpose}</p>
                      )}

                      {doc.mentorApproval?.note && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-4">
                          <p className="text-xs font-medium text-blue-600 mb-1">Mentor Note:</p>
                          <p className="text-sm text-blue-800">{doc.mentorApproval.note}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-2">
                          <select
                            className="w-full border rounded-lg p-2 text-sm"
                            value=""
                            onChange={(e) => {
                              const template = e.target.value;
                              if (!template) return;
                              setDocNotes((prev) => ({ ...prev, [doc._id]: template }));
                            }}
                          >
                            <option value="">Select rejection reason template</option>
                            {rejectionTemplates.map((template) => (
                              <option key={template} value={template}>{template}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder="Add a note (required for rejection)"
                            className="w-full border rounded-lg p-2 text-sm"
                            rows="2"
                            value={docNotes[doc._id] || ''}
                            onChange={(e) => setDocNotes((prev) => ({ ...prev, [doc._id]: e.target.value }))}
                          />
                        </div>
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

          {/* DEPARTMENT TAB */}
          {activeTab === 'department' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Department Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <StatCard icon={Users} label="Total Applications" value={applications.length} color="bg-blue-500" />
                <StatCard icon={BarChart3} label="Shortlisted" value={shortlistedCount} color="bg-indigo-500" />
                <StatCard icon={CheckCircle2} label="Selected/Offered" value={selectedCount} color="bg-green-500" />
                <StatCard icon={Clock} label="Scheduled Interviews" value={interviewCount} color="bg-amber-500" />
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Top Organizations (By Applications)</h3>
                {topOrganizations.length === 0 ? (
                  <p className="text-gray-500 text-center py-6">No organization data available yet</p>
                ) : (
                  <div className="space-y-3">
                    {topOrganizations.map(([company, count]) => (
                      <div key={company} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <p className="text-sm font-medium text-gray-700">{company}</p>
                        <span className="text-sm font-semibold text-gray-800">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SHARED REPORTS TAB */}
          {activeTab === 'shared-reports' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Shared Attendance Reports</h2>
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="date"
                    value={sharedFromDate}
                    onChange={(e) => setSharedFromDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <input
                    type="date"
                    value={sharedToDate}
                    onChange={(e) => setSharedToDate(e.target.value)}
                    className="border rounded-lg p-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      setSharedFromDate('');
                      setSharedToDate('');
                    }}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Clear Dates
                  </button>
                  <button
                    onClick={exportSharedReportsCsv}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
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
              ) : getFilteredSharedReports().length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Download size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No shared attendance reports found for selected date range</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredSharedReports().map((report) => (
                    <div key={report._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div
                        className="p-6 border-b cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-gray-800">Attendance Report</h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {report.filterMode === 'all' ? 'All Attendance' : `Date: ${report.filterDate || 'N/A'}`}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              Shared by: {report.sharedBy?.name || report.sharedByName || 'Internal Guide'} • {new Date(report.createdAt).toLocaleString()}
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
                                          record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}
                                      >
                                        {record.status?.toUpperCase() || 'N/A'}
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

export default HODDashboard;
