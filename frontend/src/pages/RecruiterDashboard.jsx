import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase, Users, Plus, X, Search, Filter, Eye, ChevronDown,
  MapPin, Clock, DollarSign, CheckCircle2, XCircle, Mail, FileText,
  Star, Building2, ArrowRight, LayoutDashboard, Send, Edit, Trash2, CalendarDays,
} from 'lucide-react';

const STATUS_COLORS = {
  applied: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  selected: 'bg-purple-100 text-purple-700',
  interview: 'bg-indigo-100 text-indigo-700',
  offered: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  offer_declined: 'bg-gray-100 text-gray-500',
};

const RecruiterDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [cancelingInterviewId, setCancelingInterviewId] = useState(null);
  const [reschedulingInterviewId, setReschedulingInterviewId] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);


const [interviewForm, setInterviewForm] = useState({
  date: '',
  time: '',
  mode: 'online',
  meetingLink: '',
  location: ''
});

  const [jobForm, setJobForm] = useState({
    title: '', company: user?.companyName || '', type: 'internship',
    domain: '', description: '', requiredSkills: '',
    eligibility: '', stipend: '', location: '', duration: '', deadline: '',
  });
  const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 flex items-center gap-5">
    <div className={`${color} p-4 rounded-xl text-white shadow`}>
      <Icon size={26} />
    </div>

    <div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);
  

  // Fetch my jobs
  useEffect(() => {
    fetchMyJobs();
    fetchScheduledInterviews();
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/jobs/mine');
      setJobs(res.data.jobs || res.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...jobForm,
        requiredSkills: jobForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      };
      await axios.post('/api/jobs', payload);
      setShowPostForm(false);
      setJobForm({ title: '', company: user?.companyName || '', type: 'internship', domain: '', description: '', requiredSkills: '', eligibility: '', stipend: '', location: '', duration: '', deadline: '' });
      fetchMyJobs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post job');
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job listing?')) return;
    try {
      await axios.delete(`/api/jobs/${jobId}`);
      fetchMyJobs();
      if (selectedJob?._id === jobId) setSelectedJob(null);
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const fetchApplicants = async (jobId) => {
    try {
      const res = await axios.get(`/api/applications/job/${jobId}`);
      setApplicants(res.data.applications || res.data.applicants || []);
    } catch (err) {
      console.error('Failed to fetch applicants', err);
    }
  };

  const fetchScheduledInterviews = async () => {
    try {
      const res = await axios.get('/api/applications/scheduled/mine');
      setScheduledInterviews(res.data.interviews || []);
    } catch (err) {
      console.error('Failed to fetch scheduled interviews', err);
    }
  };

  const handleStatusUpdate = async (appId, newStatus) => {
  try {
    await axios.put(
      `/api/applications/${appId}/status`,
      { status: newStatus }
    );

    fetchApplicants(selectedJob._id);

  } catch (err) {
    console.error(err);
    alert("Failed to update status");
  }
};
const handleScheduleInterview = async () => {
  try {

    const res = await axios.put(
      `/api/applications/schedule-interview/${selectedJob._id}`,
      interviewForm
    );

    alert("Interview scheduled successfully");

    setShowInterviewModal(false);
    fetchApplicants(selectedJob._id);
    fetchScheduledInterviews();

  } catch (err) {

    alert("Failed to schedule interview");

  }
};

const openRescheduleModal = (interviewApplication) => {
  setSelectedInterview(interviewApplication);
  setInterviewForm({
    date: interviewApplication.interview?.date
      ? new Date(interviewApplication.interview.date).toISOString().split('T')[0]
      : '',
    time: interviewApplication.interview?.time || '',
    mode: interviewApplication.interview?.mode || 'online',
    meetingLink: interviewApplication.interview?.meetingLink || '',
    location: interviewApplication.interview?.location || ''
  });
  setShowRescheduleModal(true);
};

const handleRescheduleInterview = async () => {
  if (!selectedInterview?._id) return;

  try {
    setReschedulingInterviewId(selectedInterview._id);
    await axios.put(`/api/applications/${selectedInterview._id}/reschedule-interview`, interviewForm);
    alert('Interview rescheduled successfully');
    setShowRescheduleModal(false);
    setSelectedInterview(null);
    fetchScheduledInterviews();
    if (selectedJob?._id) fetchApplicants(selectedJob._id);
  } catch (err) {
    alert(err.response?.data?.message || 'Failed to reschedule interview');
  } finally {
    setReschedulingInterviewId(null);
  }
};

const handleCancelInterview = async (applicationId) => {
  const confirmCancel = window.confirm('Cancel this scheduled interview?');
  if (!confirmCancel) return;

  try {
    setCancelingInterviewId(applicationId);
    await axios.put(`/api/applications/${applicationId}/cancel-interview`);
    alert('Interview cancelled successfully');
    fetchScheduledInterviews();
    if (selectedJob?._id) fetchApplicants(selectedJob._id);
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to cancel interview';
    alert(msg);
  } finally {
    setCancelingInterviewId(null);
  }
};

  const viewApplicants = (job) => {
    setSelectedJob(job);
    fetchApplicants(job._id);
    setActiveTab('applicants');
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'postjob', label: 'Post Job', icon: Plus },
    { key: 'listings', label: 'My Listings', icon: Briefcase },
    { key: 'applicants', label: 'Applicants', icon: Users },
  ];

  const openJobs = jobs.filter(j => j.status === 'open');
  const closedJobs = jobs.filter(j => j.status === 'closed');

  const formatInterviewDate = (dateValue) => {
    if (!dateValue) return 'Date not set';
    return new Date(dateValue).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-blue-50">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/80 backdrop-blur border-r shadow-sm min-h-[calc(100vh-64px)] p-5">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 text-lg">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.companyName || 'Recruiter'}</p>
          </div>
          <nav className="space-y-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === t.key
  ? 'bg-indigo-600 text-white shadow-md'
  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                <t.icon size={18} />
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8 space-y-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Recruiter Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard icon={Briefcase} label="Total Listings" value={jobs.length} color="bg-blue-500" />
                <StatCard icon={CheckCircle2} label="Open Jobs" value={openJobs.length} color="bg-green-500" />
                <StatCard icon={Users} label="Total Applicants" value={jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0)} color="bg-purple-500" />
                <StatCard icon={CalendarDays} label="Scheduled Interviews" value={scheduledInterviews.length} color="bg-indigo-500" />
              </div>
              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Recent Listings</h3>
                {jobs.slice(0, 5).map(job => (
                  <div key={job._id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{job.title}</p>
                      <p className="text-sm text-gray-500">{job.type} • {job.location || 'Remote'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
                      <button onClick={() => viewApplicants(job)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                        View <ArrowRight size={14} className="inline" />
                      </button>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && <p className="text-gray-400 text-center py-4">No job listings yet</p>}
              </div>

              <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-6 mt-6">
                <h3 className="font-semibold text-gray-800 mb-4">Scheduled Interview List</h3>

                {scheduledInterviews.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No interviews scheduled yet</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledInterviews.map((item) => (
                      <div key={item._id} className="border rounded-xl p-4 bg-gray-50/70">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-gray-800">{item.studentId?.name || 'Student'}</p>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                            {item.interview?.mode || 'Mode not set'}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mt-1">{item.studentId?.email || 'Email not available'}</p>
                        <p className="text-sm text-gray-700 mt-2">
                          <span className="font-medium">Job:</span> {item.jobId?.title || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Company:</span> {item.jobId?.company || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Date:</span> {formatInterviewDate(item.interview?.date)}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Time:</span> {item.interview?.time || 'Time not set'}
                        </p>

                        {item.interview?.mode === 'online' && item.interview?.meetingLink && (
                          <p className="text-sm text-gray-700 break-all">
                            <span className="font-medium">Meeting Link:</span> {item.interview.meetingLink}
                          </p>
                        )}

                        {item.interview?.mode === 'offline' && item.interview?.location && (
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Location:</span> {item.interview.location}
                          </p>
                        )}

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => openRescheduleModal(item)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelInterview(item._id)}
                            disabled={cancelingInterviewId === item._id}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {cancelingInterviewId === item._id ? 'Cancelling...' : 'Cancel Interview'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* POST JOB TAB */}
          {activeTab === 'postjob' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Post New Job</h2>
              <form onSubmit={handlePostJob} className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Job Title *" value={jobForm.title} onChange={v => setJobForm({...jobForm, title: v})} required />
                  <Input label="Company *" value={jobForm.company} onChange={v => setJobForm({...jobForm, company: v})} required />
                  <Select label="Type *" value={jobForm.type} onChange={v => setJobForm({...jobForm, type: v})} options={[{v:'internship',l:'Internship'},{v:'fulltime',l:'Full-Time'},{v:'parttime',l:'Part-Time'}]} />
                  <Input label="Domain" value={jobForm.domain} onChange={v => setJobForm({...jobForm, domain: v})} placeholder="e.g. Web Development" />
                  <Input label="Location" value={jobForm.location} onChange={v => setJobForm({...jobForm, location: v})} placeholder="e.g. Mumbai / Remote" />
                  <Input label="Duration" value={jobForm.duration} onChange={v => setJobForm({...jobForm, duration: v})} placeholder="e.g. 6 months" />
                  <Input label="Stipend / Salary" value={jobForm.stipend} onChange={v => setJobForm({...jobForm, stipend: v})} placeholder="e.g. ₹15,000/month" />
                  <Input label="Deadline" type="date" value={jobForm.deadline} onChange={v => setJobForm({...jobForm, deadline: v})} />
                </div>
                <div className="mt-4">
                  <Input label="Required Skills (comma-separated)" value={jobForm.requiredSkills} onChange={v => setJobForm({...jobForm, requiredSkills: v})} placeholder="react, node.js, mongodb" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eligibility</label>
                  <textarea className="w-full border rounded-lg p-2 text-sm" rows={2} value={jobForm.eligibility} onChange={e => setJobForm({...jobForm, eligibility: e.target.value})} placeholder="e.g. Final year B.Tech students with CGPA > 7.0" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea className="w-full border rounded-lg p-2 text-sm" rows={5} value={jobForm.description} onChange={e => setJobForm({...jobForm, description: e.target.value})} required placeholder="Job description, responsibilities, requirements..." />
                </div>
                <button type="submit" className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2">
                  <Send size={16} /> Post Job
                </button>
              </form>
            </div>
          )}

          {/* LISTINGS TAB */}
          {activeTab === 'listings' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Job Listings</h2>
                <button onClick={() => setActiveTab('postjob')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 text-sm">
                  <Plus size={16} /> New Job
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input type="text" placeholder="Search listings..." className="pl-10 pr-4 py-2 border rounded-lg w-full max-w-md text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="space-y-4">
                {jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase())).map(job => (
                  <div key={job._id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-6 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-800">{job.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{job.type}</span>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-4">
                        <span><Building2 size={14} className="inline mr-1" />{job.company}</span>
                        {job.location && <span><MapPin size={14} className="inline mr-1" />{job.location}</span>}
                        {job.deadline && <span><Clock size={14} className="inline mr-1" />Due: {new Date(job.deadline).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => viewApplicants(job)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-1">
                        <Users size={14} /> Applicants
                      </button>
                      <button onClick={() => handleDeleteJob(job._id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Briefcase size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">No job listings yet</p>
                    <button onClick={() => setActiveTab('postjob')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">Post Your First Job</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPLICANTS TAB */}
          {activeTab === 'applicants' && (
            <div>
              <div className="flex items-center justify-between mb-8 bg-white p-5 rounded-2xl shadow-md">
  <div className="flex items-center gap-4">
    
    <button
      onClick={() => setActiveTab('listings')}
      className="text-gray-500 hover:text-indigo-600 text-sm"
    >
      ← Back
    </button>

    <h2 className="text-2xl font-bold text-gray-800">
      Applicants for: {selectedJob?.title}
    </h2>

  </div>

  <button
    onClick={() => setShowInterviewModal(true)}
    className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium shadow hover:bg-indigo-700 transition"
  >
    Schedule Interview
  </button>
</div>              {!selectedJob ? (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <p className="text-gray-500 mb-4">Choose a job from listings to view applicants</p>
                  {jobs.map(job => (
                    <button key={job._id} onClick={() => viewApplicants(job)} className="block w-full text-left px-4 py-3 border rounded-lg mb-2 hover:bg-indigo-50 transition">
                      <span className="font-medium">{job.title}</span> — <span className="text-sm text-gray-500">{job.company}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {applicants.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                      <Users size={40} className="mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No applicants yet</p>
                    </div>
                  )}
                  {applicants.map(app => (
                    <div key={app._id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-6 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">{app.studentId?.name || 'Student'}</h4>
                          <p className="text-sm text-gray-500">{app.studentId?.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {app.matchScore > 0 && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <Star size={12} /> {app.matchScore}% match
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-500'}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {app.coverNote && (
                        <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded-lg">{app.coverNote}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {['under_review','selected','interview','offered','rejected'].map(s => (
  <button
    key={s}
    onClick={() => handleStatusUpdate(app._id, s)}
    disabled={app.status?.toLowerCase() === s}
    className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
      app.status?.toLowerCase() === s
        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
    }`}
  >
    
    {s.replace('_', ' ')}
  </button>
))}

                        {(app.status === 'interview_scheduled' || app.interviewScheduled || app.interview?.date) && (
                          <button
                            onClick={() => openRescheduleModal(app)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium transition bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            Reschedule Interview
                          </button>
                        )}


                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
        {showInterviewModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>

      <div className="space-y-3">

        <Input
          label="Interview Date"
          type="date"
          value={interviewForm.date}
          onChange={(v)=>setInterviewForm({...interviewForm,date:v})}
        />

        <Input
          label="Interview Time"
          type="time"
          value={interviewForm.time}
          onChange={(v)=>setInterviewForm({...interviewForm,time:v})}
        />

        <Select
          label="Mode"
          value={interviewForm.mode}
          onChange={(v)=>setInterviewForm({...interviewForm,mode:v})}
          options={[
            {v:'online',l:'Online'},
            {v:'offline',l:'Offline'}
          ]}
        />

        {interviewForm.mode === 'online' && (
          <Input
            label="Meeting Link"
            value={interviewForm.meetingLink}
            onChange={(v)=>setInterviewForm({...interviewForm,meetingLink:v})}
          />
        )}

        {interviewForm.mode === 'offline' && (
          <Input
            label="Interview Location"
            value={interviewForm.location}
            onChange={(v)=>setInterviewForm({...interviewForm,location:v})}
          />
        )}

      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={()=>setShowInterviewModal(false)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          Cancel
        </button>

        <button
          onClick={handleScheduleInterview}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
        >
          Schedule Interview
        </button>
      </div>
    </div>
  </div>
)}

{showRescheduleModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Reschedule Interview</h3>

      <div className="space-y-3">
        <Input
          label="Interview Date"
          type="date"
          value={interviewForm.date}
          onChange={(v)=>setInterviewForm({...interviewForm,date:v})}
        />

        <Input
          label="Interview Time"
          type="time"
          value={interviewForm.time}
          onChange={(v)=>setInterviewForm({...interviewForm,time:v})}
        />

        <Select
          label="Mode"
          value={interviewForm.mode}
          onChange={(v)=>setInterviewForm({...interviewForm,mode:v})}
          options={[
            {v:'online',l:'Online'},
            {v:'offline',l:'Offline'}
          ]}
        />

        {interviewForm.mode === 'online' && (
          <Input
            label="Meeting Link"
            value={interviewForm.meetingLink}
            onChange={(v)=>setInterviewForm({...interviewForm,meetingLink:v})}
          />
        )}

        {interviewForm.mode === 'offline' && (
          <Input
            label="Interview Location"
            value={interviewForm.location}
            onChange={(v)=>setInterviewForm({...interviewForm,location:v})}
          />
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={()=>{
            setShowRescheduleModal(false);
            setSelectedInterview(null);
          }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          Cancel
        </button>

        <button
          onClick={handleRescheduleInterview}
          disabled={reschedulingInterviewId === selectedInterview?._id}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-60"
        >
          {reschedulingInterviewId === selectedInterview?._id ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
    
  );
};

// Helper components
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
    <div className={`${color} p-3 rounded-xl text-white`}><Icon size={24} /></div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder = '', required = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input type={type} className="w-full border rounded-lg p-2 text-sm" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select className="w-full border rounded-lg p-2 text-sm" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>

);

export default RecruiterDashboard;
