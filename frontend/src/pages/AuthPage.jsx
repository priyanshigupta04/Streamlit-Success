import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap,Presentation, 
  Building2, Briefcase, ArrowLeft, Mail, Lock, User, 
  Compass, LayoutDashboard, Shield, BookOpen, Award
} from 'lucide-react';

// Role-based route mapping
const ROLE_ROUTES = {
  student:        '/student-dashboard',
  recruiter:      '/recruiter-dashboard',
  mentor:         '/mentor-dashboard',
  internal_guide: '/guide-dashboard',
  placement_cell: '/placement-dashboard',
  hod:            '/hod-dashboard',
  dean:           '/dean-dashboard',
  admin:          '/admin-dashboard',
};

const AuthPage = () => {
  // States for View and Data
  const [view, setView] = useState('role-select'); // 'role-select' or 'auth-form'
  const [role, setRole] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState("");
  
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to correct dashboard
  useEffect(() => {
    if (!loading && user) {
      // if mentor without department somehow got through, log them out
      if (user.role === 'mentor' && !user.department) {
        setError('Mentor account not linked to any department.');
        return;
      }
      navigate(ROLE_ROUTES[user.role] || '/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Ensure auth form is cleared when opening the auth view so placeholders are visible
  useEffect(() => {
    if (view === 'auth-form') {
      setFormData({ name: '', email: '', password: '' });
    }
  }, [view]);

  // Roles Definition with Bento Colors
  const roles = [
    { id: 'student', title: 'Student', icon: GraduationCap, color: 'text-violet-500', bg: 'bg-violet-50' },
    { id: 'mentor', title: 'Mentor', icon: Presentation, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'recruiter', title: 'Recruiter', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'internal_guide', title: 'Internal Guide', icon: BookOpen, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'placement_cell', title: 'Placement Cell', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'hod', title: 'HOD', icon: Shield, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'dean', title: 'Dean', icon: Award, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        // LOGIN: role comes from server, not from UI
        const loggedInUser = await login(formData.email, formData.password);
        navigate(ROLE_ROUTES[loggedInUser.role] || '/dashboard');
      } else {
        // REGISTER: role is selected from UI (needed for account creation)
        await register({ ...formData, role });
        // After registration, auto-login
        const loggedInUser = await login(formData.email, formData.password);
        navigate(ROLE_ROUTES[loggedInUser.role] || '/dashboard');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 font-sans">
      {/* Main Bento Grid Container */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* Left: Branding Bento Box (Dark) */}
        <div className="lg:col-span-4 bg-[#111111] rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[400px]">
          {/* Decorative background icon */}
          <div className="absolute top-0 right-0 p-4 opacity-10 translate-x-10 -translate-y-10">
             <LayoutDashboard size={200} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-xl shadow-lg shadow-violet-500/20"></div>
              <h1 className="text-xl font-bold tracking-tight">Streamlining Success</h1>
            </div>
            <h2 className="text-4xl font-semibold leading-[1.2] mb-6">
              Empowering the next generation of <span className="text-violet-400 italic">Professionals.</span>
            </h2>
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-gray-400 text-sm leading-relaxed">
              Join the portal to kickstart your professional journey.
            </p>
          </div>
        </div>

        {/* Right: Interaction Bento Box (Form Area) */}
        <div className="lg:col-span-6 bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col justify-center">
          
          {/* View 1: Role Selection — only for Registration */}
          {view === 'role-select' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Compass className="text-violet-500" size={24} /> 
                  {isLogin ? 'Welcome Back' : 'Get Started'}
                </h3>
                <p className="text-gray-500">
                  {isLogin ? 'Sign in to continue to your portal.' : 'Choose your role to create an account.'}
                </p>
              </div>

              {isLogin ? (
                /* LOGIN: No role selection needed — go straight to form */
                <div>
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email" placeholder="Email Address" 
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" 
                        required value={formData.email} autoComplete="email"
                        onChange={(e)=>setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="password" placeholder="Password" 
                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" 
                        required value={formData.password} autoComplete="current-password"
                        onChange={(e)=>setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                    <button type="submit" 
                      className="w-full bg-violet-600 text-white font-bold py-4 rounded-2xl hover:bg-violet-700 shadow-xl shadow-violet-200 transition-all active:scale-[0.98] mt-4">
                      Sign In
                    </button>
                  </form>
                  {error && <div className="mt-4 text-red-500 text-sm text-center">{error}</div>}
                  <div className="mt-8 text-center text-sm">
                    <span className="text-gray-500">Don't have an account?</span>
                    <button onClick={() => { setIsLogin(false); setFormData({ name: '', email: '', password: '' }); }} 
                      className="text-violet-600 font-bold ml-2 hover:underline decoration-2 underline-offset-4">
                      Register
                    </button>
                  </div>
                </div>
              ) : (
                /* REGISTER: Show role grid */
                <div className="grid grid-cols-2 gap-4">
                  {roles.map((r) => (
                    <button 
                      key={r.id} 
                      onClick={() => { setRole(r.id); setView('auth-form'); setFormData({ name: '', email: '', password: '' }); }}
                      className="group p-6 rounded-3xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all text-left"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${r.bg} ${r.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-sm`}>
                        <r.icon size={24} />
                      </div>
                      <span className="font-bold text-gray-800 block">{r.title}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Access Portal</span>
                    </button>
                  ))}
                  <div className="col-span-2 mt-4 text-center text-sm">
                    <span className="text-gray-500">Already have an account?</span>
                    <button onClick={() => { setIsLogin(true); setFormData({ name: '', email: '', password: '' }); }} 
                      className="text-violet-600 font-bold ml-2 hover:underline decoration-2 underline-offset-4">
                      Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* View 2: Registration Form (role already selected) */
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <button 
                onClick={() => { setView('role-select'); setFormData({ name: '', email: '', password: '' }); }} 
                className="mb-8 text-gray-400 hover:text-black flex items-center text-sm font-semibold transition-colors group"
              >
                <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
                Switch Role
              </button>

              <div className="mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  Create Account
                </h3>
                <p className="text-gray-500 text-sm">
                  Registering as <span className="text-violet-600 font-black uppercase tracking-widest">{role?.replace('_', ' ')}</span>
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" 
                    required 
                    value={formData.name}
                    autoComplete="name"
                    onChange={(e)=>setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" 
                    required 
                    value={formData.email}
                    autoComplete="email"
                    onChange={(e)=>setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" 
                    required 
                    value={formData.password}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    onChange={(e)=>setFormData({...formData, password: e.target.value})}
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="w-full bg-violet-600 text-white font-bold py-4 rounded-2xl hover:bg-violet-700 shadow-xl shadow-violet-200 transition-all active:scale-[0.98] mt-4"
                >
                  Join the Portal
                </button>
              </form>

              {error && (
                <div className="mt-4 text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <div className="mt-8 text-center text-sm">
                <span className="text-gray-500">
                  Already a member?
                </span>
                <button 
                  onClick={() => { setIsLogin(true); setView('role-select'); setFormData({ name: '', email: '', password: '' }); }} 
                  className="text-violet-600 font-bold ml-2 hover:underline decoration-2 underline-offset-4"
                >
                  Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;