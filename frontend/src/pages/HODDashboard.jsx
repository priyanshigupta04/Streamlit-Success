import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  FileCheck, CheckCircle2, XCircle, LayoutDashboard, ArrowRight,
  AlertCircle, Users, BarChart3, Building, Clock,
} from 'lucide-react';

const HODDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');

  useEffect(() => {
    fetchPendingDocs();
    fetchApplications();
  }, []);

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

  const handleApprove = async (docId, action) => {
    try {
      await axios.put(`/api/documents/${docId}/approve`, {
        decision: action,
        note: approvalNote,
      });
      setApprovalNote('');
      fetchPendingDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'approvals', label: 'Approvals', icon: FileCheck },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
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
                <StatCard icon={BarChart3} label="Total Applications" value={applications.length} color="bg-blue-500" />
              </div>

              {pendingDocs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-yellow-500" /> Documents Awaiting Your Approval
                  </h3>
                  {pendingDocs.slice(0, 5).map(doc => (
                    <div key={doc._id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{doc.documentType}</p>
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
                  {scheduledInterviews.slice(0, 6).map(app => (
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

              {selectedApplications.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-500" /> Selected Students
                  </h3>
                  {selectedApplications.slice(0, 6).map(app => (
                    <div key={app._id} className="py-3 border-b last:border-0">
                      <p className="font-medium text-gray-800">{app.studentId?.name || 'Student'}</p>
                      <p className="text-sm text-gray-500">{app.studentId?.email || 'No email'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {app.jobId?.title || app.jobTitle || 'Role'} • {app.jobId?.company || app.company || 'Company'}
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

          {/* APPROVALS */}
          {activeTab === 'approvals' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Document Approvals (HOD Level)</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : pendingDocs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-300" />
                  <p className="text-gray-500">No pending documents</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingDocs.map(doc => (
                    <div key={doc._id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-800">{doc.documentType}</h3>
                          <p className="text-sm text-gray-500">
                            Student: {doc.studentId?.name} • Status: {doc.overallStatus.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          HOD Review
                        </span>
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

          {/* DEPARTMENT TAB */}
          {activeTab === 'department' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Department Overview</h2>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-gray-500 text-center py-8">Department analytics will appear here once students start using the system.</p>
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

export default HODDashboard;
