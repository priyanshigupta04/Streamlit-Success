import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Users, FileCheck, FileText, CheckCircle2, XCircle, Clock,
  Eye, LayoutDashboard, ArrowRight, AlertCircle, Search, Briefcase, FileSignature
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

  useEffect(() => {
    fetchPendingDocs();
    fetchApplications();
    fetchStudents();
    fetchInterviewStudents();
    fetchInternshipForms();
    fetchGuides();
  }, []);

  const fetchInternshipForms = async () => {
    try {
      const res = await axios.get('/api/internship-forms');
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

    const res = await axios.get("/api/mentors/interview-students");
setInterviewStudents(res.data.interviews || []);

    setInterviewStudents(res.data.interviews || []);

  } catch (err) {
    console.error("Failed to fetch interview students", err);
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
      setStudents(res.data.students || []);
    } catch (err) {
      console.error('Failed to fetch students', err);
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
    { key: 'applications', label: 'Student Applications', icon: Briefcase },
    { key: 'internship_forms', label: 'Internship Forms', icon: FileSignature },
    { key: 'documents', label: 'Document Approvals', icon: FileCheck },
    { key: 'students', label: 'My Students', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Internship Forms</h2>
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
                              onChange={(e) => setSelectedGuide({...selectedGuide, [form._id]: e.target.value})}
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">My Students</h2>
              {students.length === 0 ? (
                <p className="text-gray-500">No students registered in your department yet.</p>
              ) : (
                <div className="space-y-4">

{/* NORMAL STUDENTS */}

<h3 className="font-semibold text-gray-700">Department Students</h3>

{students.map(s => (
  <div key={s._id} className="p-4 bg-white rounded-lg shadow-sm">
    <p className="font-medium text-gray-800">{s.name}</p>
    <p className="text-sm text-gray-500">{s.email}</p>
  </div>
))}


{/* INTERVIEW STUDENTS */}

<h3 className="font-semibold text-gray-700 mt-6">
Students Selected for Interview
</h3>

{interviewStudents.length === 0 ? (
  <p className="text-gray-500">No interviews scheduled yet.</p>
) : (
  interviewStudents.map(app => (

    <div key={app._id} className="bg-white p-5 rounded-xl shadow">

      <h4 className="font-semibold text-gray-800">
        {app.studentId?.name}
      </h4>

      <p className="text-sm text-gray-500">
        {app.studentId?.email}
      </p>

      <div className="mt-3 text-sm text-gray-700">

        <p>
          <b>Job:</b> {app.jobId?.title}
        </p>

        <p>
          <b>Company:</b> {app.jobId?.company}
        </p>

        <p>
          <b>Interview Date:</b>{" "}
          {new Date(app.interview?.date).toLocaleDateString()}
        </p>

        <p>
          <b>Time:</b> {app.interview?.time}
        </p>

        {app.interview?.meetingLink && (
          <a
            href={app.interview.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 underline"
          >
            Join Meeting
          </a>
        )}

      </div>

    </div>

  ))
)}

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
