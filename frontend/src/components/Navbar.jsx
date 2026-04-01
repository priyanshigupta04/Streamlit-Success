import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, LayoutDashboard, CheckCircle2, FileText, Send, ShieldCheck, UserCircle2, ChevronDown, Bell } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ activeTab, setActiveTab, searchTerm, setSearchTerm, logout: logoutProp, onLogoutClick, profile, onProfileClick, showProfileButton = false, showProfileDropdown = false, profileName = '' }) => {
  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [notificationSignal, setNotificationSignal] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setOpenProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  const handleLogoutClick = () => {
    if (onLogoutClick) { onLogoutClick(); return; }
    setShowConfirm(true);
  };
  const doLogout = () => {
    (logoutProp || authLogout)();
    setShowConfirm(false);
    navigate('/');
  };
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={14}/> },
    { id: 'applications', label: 'Tracking', icon: <CheckCircle2 size={14}/> },
    { id: 'logs', label: 'Weekly Logs', icon: <FileText size={14}/> },
    { id: 'docs', label: 'Documents', icon: <Send size={14}/> }
  ];

  if (profile?.semester === 8) {
    tabs.push({ id: 'internship_form', label: 'Internship Form', icon: <FileText size={14}/> });
  }

  return (<>
    <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/60 px-10 py-5 flex justify-between items-center">
      <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab && setActiveTab('dashboard')}>
        <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center text-white rotate-3 shadow-lg shadow-black/20">
          <ShieldCheck size={22} />
        </div>
        <span className="text-xl font-black tracking-tighter italic">STREAMLINING.</span>
      </div>

      {setActiveTab && (
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1.5 rounded-[1.5rem]">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-black text-white shadow-xl shadow-black/10' : 'text-slate-400 hover:text-black'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4" ref={profileMenuRef}>
        {setSearchTerm && (
          <div className="relative group hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search..." 
              className="pl-11 pr-5 py-2.5 bg-slate-100 rounded-2xl outline-none text-sm w-48 focus:bg-white focus:ring-4 focus:ring-slate-100 transition-all border border-transparent focus:border-slate-200"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}

        {showProfileDropdown ? (
          <>
            <button
              onClick={() => setOpenProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
            >
              <UserCircle2 size={30} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
                {profileName || profile?.fullName || 'Profile'}
                {unreadNotificationCount > 0 && (
                  <span
                    className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"
                    aria-label="new notifications"
                  >
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                  </span>
                )}
              </span>
              <ChevronDown size={16} className="text-slate-500" />
            </button>

            {openProfileMenu && (
              <div className="absolute right-0 top-14 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-[120]">
                <button
                  onClick={() => {
                    if (onProfileClick) onProfileClick();
                    setOpenProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <UserCircle2 size={16} />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setNotificationSignal((prev) => prev + 1);
                    setOpenProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <span className="relative inline-flex">
                      <Bell size={16} />
                      {unreadNotificationCount > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 font-bold text-center">
                          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                      )}
                    </span>
                    Notification
                  </span>
                  {unreadNotificationCount > 0 && (
                    <span className="text-xs font-bold text-rose-600">{unreadNotificationCount}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    handleLogoutClick();
                    setOpenProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {showProfileButton && (
          <button
            onClick={onProfileClick}
            className="px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm text-sm font-semibold"
            title="My Profile"
          >
            <UserCircle2 size={18} />
            My Profile
          </button>
            )}
            <NotificationBell />
            <button 
              onClick={handleLogoutClick}
              className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
              title="Sign Out"
            >
              <LogOut size={20}/>
            </button>
          </>
        )}
        {showProfileDropdown && (
          <NotificationBell
            externalToggleSignal={notificationSignal}
            hideTrigger
            onUnreadCountChange={setUnreadNotificationCount}
          />
        )}
      </div>
    </nav>

    {/* Logout confirmation (used when no external modal provided) */}
    {showConfirm && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirm(false)}></div>
        <div className="bg-white relative z-10 rounded-2xl p-8 shadow-2xl max-w-sm w-full">
          <h3 className="text-lg font-black mb-2">Sign out?</h3>
          <p className="text-sm text-slate-500 mb-6">You will be returned to the login page.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowConfirm(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 text-sm font-bold hover:bg-slate-200 transition-all">Cancel</button>
            <button onClick={doLogout} className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all">Sign Out</button>
          </div>
        </div>
      </div>
    )}
  </>);
};

export default Navbar;
