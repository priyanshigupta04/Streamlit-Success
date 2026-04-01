import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { validateProfilePayload } from '../utils/profileValidation';
import { LayoutDashboard, Users, Bell, FileCheck, BarChart3, Users as UsersIcon, ShieldCheck, GraduationCap, ClipboardList, Search, RefreshCw, UserCircle2 } from 'lucide-react';
import DashboardSection from '../components/PlacementCell/DashboardSection';
import UserManagementSection from '../components/PlacementCell/UserManagementSection';
import BroadcastSection from '../components/PlacementCell/BroadcastSection';
import JobApprovalsSection from '../components/PlacementCell/JobApprovalsSection';
import AnalyticsSection from '../components/PlacementCell/AnalyticsSection';
import MentorManagementSection from '../components/PlacementCell/MentorManagementSection';

const DEPARTMENT_OPTIONS = ['SOCSET', 'SOTE', 'SOB', 'SAAD'];

const PlacementCellDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [userPages, setUserPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [internshipForms, setInternshipForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [offerLetterData, setOfferLetterData] = useState({ summary: { total: 0, uploaded: 0, missing: 0 }, students: [] });
  const [loadingOfferLetters, setLoadingOfferLetters] = useState(false);
  const [offerTrackerError, setOfferTrackerError] = useState('');
  const [offerSearch, setOfferSearch] = useState('');
  const [offerStatusFilter, setOfferStatusFilter] = useState('uploaded');
  const [offerDepartment, setOfferDepartment] = useState('all');
  const [docStatusFilter, setDocStatusFilter] = useState('all');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState('');
  const [deletingInternshipId, setDeletingInternshipId] = useState('');
  const [deletingOfferStudentId, setDeletingOfferStudentId] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    universityName: '',
    designation: '',
    officeLocation: '',
    officeContact: '',
    supportEmail: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchMyProfile();
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
        universityName: data.universityName || '',
        designation: data.designation || '',
        officeLocation: data.officeLocation || '',
        officeContact: data.officeContact || '',
        supportEmail: data.supportEmail || '',
        linkedinUrl: data.linkedinUrl || data.linkedin || '',
        githubUrl: data.githubUrl || data.github || '',
        portfolioUrl: data.portfolioUrl || '',
      });
    } catch (err) {
      console.error('Failed to fetch placement profile', err);
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
        universityName: profileForm.universityName,
        designation: profileForm.designation,
        officeLocation: profileForm.officeLocation,
        officeContact: profileForm.officeContact,
        supportEmail: profileForm.supportEmail,
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

  useEffect(() => {
    fetchUsers();
  }, [currentPage, roleFilter]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      if (roleFilter) params.append('role', roleFilter);
      if (userSearch) params.append('search', userSearch);
      const res = await axios.get(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.users);
      setTotalUsers(res.data.total);
      setUserPages(res.data.pages);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'my_profile', label: 'My Profile', icon: UserCircle2 },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'broadcast', label: 'Broadcast', icon: Bell },
    { key: 'approvals', label: 'Job Approvals', icon: FileCheck },
    { key: 'documents', label: 'Documents Monitor', icon: ShieldCheck },
    { key: 'internships', label: 'Internship Oversight', icon: GraduationCap },
    { key: 'offerLetters', label: 'Offer Letter Tracker', icon: ClipboardList },
    { key: 'mentors', label: 'Mentor Management', icon: UsersIcon },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const handleSearchSubmit = (searchText) => {
    setCurrentPage(1);
    setUserSearch(searchText);
  };

  useEffect(() => {
    if (activeTab === 'approvals') fetchPendingJobs();
    if (activeTab === 'documents') fetchAllDocuments();
    if (activeTab === 'internships') fetchInternshipForms();
    if (activeTab === 'offerLetters') fetchOfferLetterTracker();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'offerLetters') {
      fetchOfferLetterTracker();
    }
  }, [offerStatusFilter, offerDepartment]);

  const fetchPendingJobs = async () => {
    try {
      setLoadingPending(true);
      const res = await axios.get('/api/jobs/pending');
      setPendingJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Failed to load pending jobs', err);
      setPendingJobs([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApprove = async (jobId) => {
    if (!window.confirm('Approve this job and publish it for students?')) return;
    try {
      await axios.put(`/api/jobs/${jobId}/approve`);
      fetchPendingJobs();
      fetchStats();
      alert('Job approved');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (jobId) => {
    const reason = window.prompt('Enter reason for rejection (optional):');
    if (reason === null) return;
    try {
      await axios.put(`/api/jobs/${jobId}/reject`, { reason });
      fetchPendingJobs();
      fetchStats();
      alert('Job rejected and recruiter notified');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const fetchAllDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const res = await axios.get('/api/documents/all');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchInternshipForms = async () => {
    try {
      setLoadingForms(true);
      const res = await axios.get('/api/internship-forms');
      setInternshipForms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch internship forms', err);
      setInternshipForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const fetchOfferLetterTracker = async () => {
    try {
      setLoadingOfferLetters(true);
      setOfferTrackerError('');
      const params = new URLSearchParams();
      if (offerSearch) params.append('search', offerSearch);
      if (offerStatusFilter) params.append('status', offerStatusFilter);
      if (offerDepartment !== 'all') params.append('department', offerDepartment);

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get(`/api/admin/students/offer-letters${query}`);
      setOfferLetterData(res.data || { summary: { total: 0, uploaded: 0, missing: 0 }, students: [] });
    } catch (err) {
      console.error('Failed to fetch offer letter tracker', err);
      setOfferTrackerError(err.response?.data?.message || 'Unable to load offer-letter tracker. Ensure backend is running and you are logged in as placement_cell.');
      setOfferLetterData({ summary: { total: 0, uploaded: 0, missing: 0 }, students: [] });
    } finally {
      setLoadingOfferLetters(false);
    }
  };

  const renderStatusPill = (status) => {
    const map = {
      pending: 'bg-amber-100 text-amber-700',
      mentor_approved: 'bg-blue-100 text-blue-700',
      hod_approved: 'bg-indigo-100 text-indigo-700',
      issued: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
      approved: 'bg-emerald-100 text-emerald-700',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  };

  const formatRole = (role = '') => role.replace('_', ' ');
  const canManageDelete = ['placement_cell', 'admin'].includes(user?.role);

  const filteredDocuments = documents.filter((doc) => {
    if (docStatusFilter === 'all') return true;
    return doc.overallStatus === docStatusFilter;
  });

  const downloadOfferCsv = () => {
    const rows = offerLetterData.students || [];
    if (!rows.length) {
      alert('No data available to export.');
      return;
    }

    const headers = ['Name', 'Email', 'Enrollment No', 'Department', 'Mentor', 'Status', 'Offer Letter Name', 'Offer Letter URL', 'Hash'];
    const toCell = (v) => `"${String(v || '').replace(/"/g, '""')}"`;

    const csv = [
      headers.join(','),
      ...rows.map((s) => [
        s.name,
        s.email,
        s.enrollmentNo,
        s.department,
        s.mentorId?.name,
        s.offerLetterUrl ? 'Uploaded' : 'Missing',
        s.offerLetterName,
        s.offerLetterUrl,
        s.offerLetterHash,
      ].map(toCell).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offer-letter-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteDocument = async (docId) => {
    if (!docId) return;
    if (!window.confirm('Delete this document request? This action cannot be undone.')) return;
    try {
      setDeletingDocumentId(docId);
      await axios.delete(`/api/documents/${docId}`);
      fetchAllDocuments();
      alert('Document request deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document request');
    } finally {
      setDeletingDocumentId('');
    }
  };

  const handleDeleteInternshipForm = async (formId) => {
    if (!formId) return;
    if (!window.confirm('Delete this internship form? This action cannot be undone.')) return;
    try {
      setDeletingInternshipId(formId);
      await axios.delete(`/api/internship-forms/${formId}`);
      fetchInternshipForms();
      alert('Internship form deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete internship form');
    } finally {
      setDeletingInternshipId('');
    }
  };

  const handleDeleteOfferLetter = async (studentId, studentName = 'this student') => {
    if (!studentId) return;
    if (!window.confirm(`Delete offer letter for ${studentName}?`)) return;
    try {
      setDeletingOfferStudentId(studentId);
      await axios.delete(`/api/admin/students/${studentId}/offer-letter`);
      fetchOfferLetterTracker();
      alert('Offer letter deleted');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete offer letter');
    } finally {
      setDeletingOfferStudentId('');
    }
  };

  const openStudentProfile = async (studentId) => {
    if (!studentId) return;
    try {
      setLoadingProfile(true);
      setProfileModalOpen(true);
      const res = await axios.get(`/api/admin/users/${studentId}`);
      setSelectedStudentProfile(res.data.user || null);
    } catch (err) {
      setSelectedStudentProfile(null);
      alert(err.response?.data?.message || 'Failed to load student profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleOpenOfferLetter = async (studentId, fileName = 'offer-letter.pdf') => {
    try {
      const response = await axios.get(`/api/upload/offer-letter/view/${studentId}`, {
        responseType: 'blob',
      });

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-cyan-50">
      <Navbar
        showProfileDropdown
        profileName={profileForm.name || user?.name}
        onProfileClick={() => setActiveTab('my_profile')}
      />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-white/90 backdrop-blur border-r border-slate-200 min-h-[calc(100vh-64px)] p-5 shadow-lg">
          <div className="mb-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-700 mb-3">Control Room</div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{user?.name}</h3>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Placement Cell</p>
          </div>
          <nav className="space-y-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === t.key ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && <DashboardSection stats={stats} />}

          {activeTab === 'my_profile' && (
            <div className="max-w-3xl">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-1">Placement Cell Profile</h2>
                <p className="text-sm text-slate-500 mb-6">Manage your profile details shown across notifications and approvals.</p>
                <form onSubmit={saveMyProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-500"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone</label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">University Name</label>
                      <input
                        type="text"
                        value={profileForm.universityName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, universityName: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Designation</label>
                      <input
                        type="text"
                        value={profileForm.designation}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, designation: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Office Location</label>
                      <input
                        type="text"
                        value={profileForm.officeLocation}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, officeLocation: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Office Contact</label>
                      <input
                        type="text"
                        value={profileForm.officeContact}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, officeContact: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Support Email</label>
                      <input
                        type="email"
                        value={profileForm.supportEmail}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={profileForm.linkedinUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">GitHub URL</label>
                      <input
                        type="url"
                        value={profileForm.githubUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, githubUrl: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Portfolio / Website</label>
                      <input
                        type="url"
                        value={profileForm.portfolioUrl}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, portfolioUrl: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                        placeholder="https://your-website.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                      placeholder="Add a short profile summary"
                    />
                  </div>
                  {profileFeedback.message && (
                    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${profileFeedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {profileFeedback.message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-60"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <UserManagementSection
              users={users}
              totalUsers={totalUsers}
              userPages={userPages}
              currentPage={currentPage}
              loading={loading}
              onPageChange={setCurrentPage}
              onFilterChange={(role) => {
                setRoleFilter(role);
                setCurrentPage(1);
              }}
              onSearch={handleSearchSubmit}
              onRefresh={() => {
                fetchUsers();
                fetchStats();
              }}
              onUserUpdate={handleRoleChange}
              onUserDelete={handleDeleteUser}
            />
          )}

          {/* BROADCAST TAB */}
          {activeTab === 'broadcast' && <BroadcastSection />}

          {/* APPROVALS TAB */}
          {activeTab === 'approvals' && (
            <JobApprovalsSection
              pendingJobs={pendingJobs}
              loading={loadingPending}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {/* DOCUMENTS MONITOR TAB */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Document Pipeline Monitor</h2>
                  <p className="text-sm text-slate-500">Track NOC, LOR and Bonafide requests across all approval stages</p>
                </div>
                <div className="flex items-center gap-2">
                  {['all', 'pending', 'mentor_approved', 'hod_approved', 'issued', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setDocStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${docStatusFilter === status ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {formatRole(status)}
                    </button>
                  ))}
                  <button onClick={fetchAllDocuments} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                    <RefreshCw size={16} /> Refresh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {['pending', 'mentor_approved', 'hod_approved', 'issued'].map((k) => {
                  const count = documents.filter((d) => d.overallStatus === k).length;
                  return (
                    <div key={k} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">{formatRole(k)}</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{count}</p>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingDocuments ? (
                  <p className="p-6 text-sm text-slate-500">Loading documents...</p>
                ) : filteredDocuments.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No document requests available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500">Student</th>
                          <th className="text-left px-4 py-3 text-slate-500">Type</th>
                          <th className="text-left px-4 py-3 text-slate-500">Created</th>
                          <th className="text-left px-4 py-3 text-slate-500">Status</th>
                          <th className="text-left px-4 py-3 text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc) => (
                          <tr key={doc._id} className="border-t">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{doc.studentId?.name || 'Student'}</p>
                              <p className="text-xs text-slate-500">{doc.studentId?.email || '-'}</p>
                            </td>
                            <td className="px-4 py-3 font-medium uppercase text-xs">{doc.type}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(doc.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${renderStatusPill(doc.overallStatus)}`}>
                                {formatRole(doc.overallStatus)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {canManageDelete ? (
                                <button
                                  onClick={() => handleDeleteDocument(doc._id)}
                                  disabled={deletingDocumentId === doc._id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {deletingDocumentId === doc._id ? 'Deleting...' : 'Delete'}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INTERNSHIP OVERSIGHT TAB */}
          {activeTab === 'internships' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Internship Form Oversight</h2>
                  <p className="text-sm text-slate-500">Monitor submitted internship forms and assignment state</p>
                </div>
                <button onClick={fetchInternshipForms} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([key, label]) => (
                  <div key={key} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">{label}</p>
                    <p className="text-3xl font-black text-slate-900 mt-2">{internshipForms.filter((f) => f.status === key).length}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingForms ? (
                  <p className="p-6 text-sm text-slate-500">Loading internship forms...</p>
                ) : internshipForms.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No internship forms available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500">Student</th>
                          <th className="text-left px-4 py-3 text-slate-500">Company</th>
                          <th className="text-left px-4 py-3 text-slate-500">Role</th>
                          <th className="text-left px-4 py-3 text-slate-500">Mentor</th>
                          <th className="text-left px-4 py-3 text-slate-500">Guide</th>
                          <th className="text-left px-4 py-3 text-slate-500">Status</th>
                          <th className="text-left px-4 py-3 text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {internshipForms.map((form) => (
                          <tr key={form._id} className="border-t">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{form.student?.name || 'Student'}</p>
                              <p className="text-xs text-slate-500">{form.student?.department || '-'}</p>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">{form.companyName}</td>
                            <td className="px-4 py-3 text-slate-700">{form.role}</td>
                            <td className="px-4 py-3 text-slate-600">{form.mentor?.name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{form.internalGuide?.name || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${renderStatusPill(form.status)}`}>
                                {form.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openStudentProfile(form.student?._id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                >
                                  View Profile
                                </button>
                                {canManageDelete && (
                                  <button
                                    onClick={() => handleDeleteInternshipForm(form._id)}
                                    disabled={deletingInternshipId === form._id}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {deletingInternshipId === form._id ? 'Deleting...' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OFFER LETTER TRACKER TAB */}
          {activeTab === 'offerLetters' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Offer Letter Tracker</h2>
                  <p className="text-sm text-slate-500">Track uploaded vs missing offer letters department-wise</p>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      value={offerSearch}
                      onChange={(e) => setOfferSearch(e.target.value)}
                      placeholder="Search student..."
                      className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                    />
                  </div>
                  <select
                    value={offerStatusFilter}
                    onChange={(e) => setOfferStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="all">All</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="missing">Missing</option>
                  </select>
                  <select
                    value={offerDepartment}
                    onChange={(e) => setOfferDepartment(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="all">All Departments</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <button onClick={fetchOfferLetterTracker} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">
                    <RefreshCw size={16} /> Apply
                  </button>
                  <button onClick={downloadOfferCsv} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                    Export CSV
                  </button>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Students</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{offerLetterData.summary.total}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-emerald-500 font-bold">Uploaded</p>
                  <p className="text-3xl font-black text-emerald-700 mt-2">{offerLetterData.summary.uploaded}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wider text-rose-500 font-bold">Missing</p>
                  <p className="text-3xl font-black text-rose-700 mt-2">{offerLetterData.summary.missing}</p>
                </div>
              </div>

              {offerTrackerError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-semibold text-rose-700">{offerTrackerError}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loadingOfferLetters ? (
                  <p className="p-6 text-sm text-slate-500">Loading offer letters...</p>
                ) : offerLetterData.students.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No student data found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-3 text-slate-500">Student</th>
                          <th className="text-left px-4 py-3 text-slate-500">Enrollment</th>
                          <th className="text-left px-4 py-3 text-slate-500">Department</th>
                          <th className="text-left px-4 py-3 text-slate-500">Mentor</th>
                          <th className="text-left px-4 py-3 text-slate-500">Status</th>
                          <th className="text-left px-4 py-3 text-slate-500">Document</th>
                          <th className="text-left px-4 py-3 text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offerLetterData.students.map((s) => (
                          <tr key={s._id} className="border-t">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{s.name}</p>
                              <p className="text-xs text-slate-500">{s.email}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{s.enrollmentNo || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{s.department || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{s.mentorId?.name || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${s.offerLetterUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {s.offerLetterUrl ? 'Uploaded' : 'Missing'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {s.offerLetterUrl ? (
                                <button
                                  onClick={() => handleOpenOfferLetter(s._id, s.offerLetterName)}
                                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                >
                                  Offer Letter
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">Not uploaded</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {canManageDelete && s.offerLetterUrl ? (
                                <button
                                  onClick={() => handleDeleteOfferLetter(s._id, s.name)}
                                  disabled={deletingOfferStudentId === s._id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {deletingOfferStudentId === s._id ? 'Deleting...' : 'Delete'}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MENTOR MANAGEMENT TAB */}
          {activeTab === 'mentors' && <MentorManagementSection />}

          {/* ANALYTICS TAB */}
          {activeTab === 'analytics' && <AnalyticsSection stats={stats} />}
        </main>
      </div>

      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProfileModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Student Profile Snapshot</h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            {loadingProfile ? (
              <p className="text-sm text-slate-500">Loading profile...</p>
            ) : !selectedStudentProfile ? (
              <p className="text-sm text-slate-500">Profile not available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Name</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.name || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Email</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.email || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Department</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.department || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Branch</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.branch || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Enrollment</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.enrollmentNo || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Semester</p>
                  <p className="font-semibold text-slate-800">{selectedStudentProfile.semester || '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl md:col-span-2">
                  <p className="text-xs uppercase text-slate-400 font-bold mb-1">Skills</p>
                  <p className="font-semibold text-slate-800">{Array.isArray(selectedStudentProfile.skills) ? selectedStudentProfile.skills.join(', ') : (selectedStudentProfile.skills || '-')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementCellDashboard;
