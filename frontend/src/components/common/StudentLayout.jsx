import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, LayoutDashboard, Award, LogOut } from 'lucide-react';

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
  ];

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

      <main className="flex-1 ml-64 overflow-y-auto">{children}</main>
    </div>
  );
};

export default StudentLayout;
