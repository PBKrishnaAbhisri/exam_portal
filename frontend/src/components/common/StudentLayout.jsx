import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, LayoutDashboard, Award, LogOut, UserCircle, AlertTriangle, Tag, ArrowRight, FileWarning, Upload } from 'lucide-react';

const StudentLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out.');
    navigate('/login');
  };

  const navItems = [
    { to: '/student', label: 'My Exams', icon: LayoutDashboard, end: true },
    { to: '/student/results', label: 'Results', icon: Award },
    { to: '/student/profile', label: 'My Profile', icon: UserCircle },
  ];

  const hasNoDomains = user?.role === 'student' && (!user?.domains || user.domains.length === 0);
  const hasNoResume = user?.role === 'student' && !user?.resumeUrl;

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="sidebar">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">ExamPortal</p>
              <p className="text-xs text-slate-400">Student Portal</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-primary-50 border-b border-slate-100">
          <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-2">My Profile</p>
          <div className="space-y-1 text-xs text-slate-600">
            <p><span className="font-medium">Roll:</span> {user?.rollNumber}</p>
            <p><span className="font-medium">Branch:</span> {user?.branch}</p>
            <p><span className="font-medium">Year:</span> {user?.year}</p>
            <p><span className="font-medium">CGPA:</span> {user?.cgpa}</p>
            {hasNoDomains ? (
              <NavLink
                to="/student/profile"
                className="mt-2 block p-1.5 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-medium border border-amber-300 hover:bg-amber-200 transition-colors"
              >
                ⚠️ <strong>0 Domains:</strong> Click to add
              </NavLink>
            ) : (
              <p className="truncate"><span className="font-medium">Domains:</span> {user.domains.length} selected</p>
            )}
            {hasNoResume ? (
              <NavLink
                to="/student/profile"
                className="mt-2 block p-1.5 bg-red-100 text-red-900 rounded-lg text-[11px] font-semibold border border-red-300 hover:bg-red-200 transition-colors animate-pulse"
              >
                🚨 <strong>Resume Missing:</strong> Upload required
              </NavLink>
            ) : (
              <p className="truncate text-emerald-700 font-medium">✓ Resume Uploaded</p>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-link text-sm ${isActive ? 'nav-link-active' : ''}`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 font-semibold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button id="student-logout" onClick={handleLogout} className="btn-ghost w-full justify-start text-sm text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto flex flex-col">
        {/* Constant Banner if Student has no resume uploaded */}
        {hasNoResume && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-6 py-3.5 shadow-md flex items-center justify-between gap-4 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <FileWarning className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm leading-snug">Mandatory Requirement: Resume Missing</p>
                <p className="text-xs text-rose-100 mt-0.5">
                  Uploading your resume is mandatory for all registered students. Please upload your resume (PDF, max 2 MB) immediately.
                </p>
              </div>
            </div>
            <NavLink
              to="/student/profile"
              className="px-4 py-2 bg-white text-red-700 font-bold rounded-xl text-xs shadow-md hover:bg-red-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Resume Now <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        )}

        {/* Constant Banner if Student has no domains selected */}
        {hasNoDomains && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white px-6 py-3.5 shadow-md flex items-center justify-between gap-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-sm leading-snug">Action Required: No Domain of Interest Selected</p>
                <p className="text-xs text-amber-100 mt-0.5">
                  You must select at least one domain to be eligible for domain-specific exams and view your targeted assessments.
                </p>
              </div>
            </div>
            <NavLink
              to="/student/profile"
              className="px-4 py-2 bg-white text-amber-800 font-bold rounded-xl text-xs shadow-md hover:bg-amber-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <Tag className="w-3.5 h-3.5" /> Add Domains Now <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>
        )}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
};

export default StudentLayout;
