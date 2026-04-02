import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axios';
import { 
  LogOut, ShieldCheck, Search, CheckCircle2, XCircle, FileText, User
} from 'lucide-react';

const MentorDashboard = () => {
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await axios.get('/api/applications/all');
      setApplications(res.data.applications || []);
    } catch (err) {
      console.error('Failed to fetch applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`/api/applications/${id}/mentor-approve`, { mentorNote: 'Approved for further processing' });
      alert('Application Approved');
      fetchApplications();
    } catch (err) {
      alert('Failed to approve application');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return; // cancelled
    try {
      await axios.put(`/api/applications/${id}/mentor-reject`, { mentorNote: reason });
      alert('Application Rejected');
      fetchApplications();
    } catch (err) {
      alert('Failed to reject application');
    }
  };

  const filteredApps = applications.filter(app => {
    const studentName = app.studentId?.name || '';
    const company = app.jobId?.company || app.company || '';
    const role = app.jobId?.title || app.jobTitle || '';
    const searchLow = searchTerm.toLowerCase();
    
    return studentName.toLowerCase().includes(searchLow) ||
           company.toLowerCase().includes(searchLow) ||
           role.toLowerCase().includes(searchLow);
  });

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans text-slate-900">
      {/* NAVBAR */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/60 px-10 py-5 flex justify-between items-center">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white rotate-3 shadow-lg shadow-black/20">
            <ShieldCheck size={22} />
          </div>
          <span className="text-xl font-black tracking-tighter italic">STREAMLINING. <span className="text-slate-400">MENTOR</span></span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search students or jobs..." 
              className="pl-11 pr-5 py-2.5 bg-slate-100 rounded-2xl outline-none text-sm w-48 md:w-72 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all border border-transparent focus:border-slate-200"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={logout} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
            <LogOut size={20}/>
          </button>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto p-10">
        <div className="mb-10 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Student Applications</h1>
            <p className="text-slate-500 font-medium">Review and approve your assigned students' job applications.</p>
          </div>
          <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200/60 flex gap-6 shadow-sm">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Pending</p>
              <p className="text-2xl font-black text-amber-500">{applications.filter(a => a.mentorApproval?.status === 'pending').length}</p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
              <p className="text-2xl font-black">{applications.length}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-bold">Loading applications...</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-200/60 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-slate-300" size={32} />
            </div>
            <h3 className="text-2xl font-black mb-2">No Applications Found</h3>
            <p className="text-slate-400">There are currently no applications matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredApps.map(app => (
              <div key={app._id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-6 justify-between md:items-center hover:border-black transition-all group">
                
                {/* Student Info */}
                <div className="flex items-center gap-6 md:w-1/3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black">{app.studentId?.name || 'Unknown Student'}</h4>
                    <p className="text-slate-500 text-sm font-medium">{app.studentId?.email}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{app.studentId?.branch || 'Branch N/A'} • CGPA: {app.studentId?.cgpa || 'N/A'}</p>
                  </div>
                </div>

                {/* Job Info */}
                <div className="md:w-1/3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Applying For</p>
                  <h5 className="font-bold text-lg">{app.jobId?.title || app.jobTitle || 'Role'}</h5>
                  <p className="text-slate-500 text-sm font-medium">{app.jobId?.company || app.company || 'Company'}</p>
                  {app.resumeUrl && (
                    <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 mt-3 hover:underline">
                      <FileText size={14}/> View Resume
                    </a>
                  )}
                </div>

                {/* Actions / Status */}
                <div className="md:w-1/4 flex justify-end">
                  {app.mentorApproval?.status === 'pending' ? (
                    <div className="flex gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => handleReject(app._id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        <XCircle size={18}/> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(app._id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                      >
                        <CheckCircle2 size={18}/> Approve
                      </button>
                    </div>
                  ) : (
                    <div className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 ${app.mentorApproval?.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {app.mentorApproval?.status === 'approved' ? <><CheckCircle2 size={18}/> Approved</> : <><XCircle size={18}/> Rejected</>}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MentorDashboard;