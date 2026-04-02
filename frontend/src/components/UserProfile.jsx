import React from 'react';
import { Phone, Mail, Linkedin, GraduationCap, Zap, Settings } from 'lucide-react';

const UserProfile = ({ profile, status, setShowModal }) => {
  return (
    <div className="col-span-12 lg:col-span-4 space-y-8">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/50 shadow-sm relative overflow-hidden">

        {/* Profile Image & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-28 h-28 bg-slate-100 rounded-[2.2rem] shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
              {profile.image ? (
  <img
  src={profile.image}
  alt="profile"
  className="w-full h-full object-cover"
/>
) : (
  <span className="text-4xl font-black text-slate-300 italic">
    {profile.fullName?.[0]?.toUpperCase()}
  </span>
)}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-lg border-4 border-white shadow-lg"></div>
          </div>
          <h2 className="text-2xl font-black mb-1 tracking-tight text-center leading-tight">
            {profile.fullName || "Your Full Name"}
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            <GraduationCap size={14}/> {profile.branch || 'Academic Profile'}
          </p>
        </div>

        {/* Contact Links */}
        <div className="space-y-3 mb-8">
          {/* Phone */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-black shadow-sm">
              <Phone size={16} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Phone</p>
              <p className="text-[11px] font-bold text-black">{profile.contact || '+91 00000 00000'}</p>
            </div>
          </div>
          {/* Email */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-black shadow-sm">
              <Mail size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Email</p>
              <p className="text-[11px] font-bold text-black truncate">{profile.email || 'user@email.com'}</p>
            </div>
          </div>
          {/* LinkedIn */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-white hover:shadow-md transition-all">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
              <Linkedin size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">LinkedIn</p>
              <p className="text-[11px] font-bold text-black truncate">{(profile.linkedin || profile.linkedinUrl || '').replace('https://', '') || 'Not Linked'}</p>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="mb-8 p-6 bg-slate-900 rounded-[2rem] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Core Stack</p>
            <Zap size={12} className="text-amber-400 fill-amber-400" />
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const raw = profile.skills;
              const list = Array.isArray(raw)
                ? raw
                : typeof raw === 'string' && raw.trim()
                  ? raw.split(',')
                  : [];
              return list.length > 0
                ? list.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white/10 text-white text-[9px] font-bold rounded-lg uppercase">
                      {String(skill).trim()}
                    </span>
                  ))
                : <span className="text-[10px] text-slate-500 italic">No skills added</span>;
            })()}
          </div>
        </div>

        {/* CGPA & Button */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase">CGPA</p>
            <p className="text-lg font-black text-black">{profile.cgpa || '0.0'}</p>
          </div>
          {/* Quick Stats & Edit Button Section mein Status box ko replace karein */}
          <div className={`${status.bg} p-4 rounded-2xl border ${status.border} text-center transition-all duration-300`}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Status</p>
            <p className={`text-[10px] font-black ${status.color} mt-1 uppercase flex items-center justify-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.color.replace('text', 'bg')} animate-pulse`}></span>
              {status.label}
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
          <Settings size={14} /> Update Master Profile
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
