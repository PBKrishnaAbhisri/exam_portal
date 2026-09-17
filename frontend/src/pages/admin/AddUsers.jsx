import { useState, useEffect } from 'react';
import AdminLayout from '../../components/common/AdminLayout';
import { getAdminUsers, createFacultyUser, deleteFacultyUser } from '../../api';
import toast from 'react-hot-toast';
import {
  UserPlus,
  Shield,
  ShieldAlert,
  UserCheck,
  Mail,
  Lock,
  User,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Search,
  Users,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

/**
 * Generate a strong, secure random password (14 characters)
 * Guarantees at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol
 */
const generateStrongPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // exclude l
  const numbers = '23456789'; // exclude 0, 1
  const symbols = '!@#$%^&*_-+=';
  const all = upper + lower + numbers + symbols;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < 14; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password characters
  return pwd
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

const AddUsers = () => {
  const [users, setUsers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: generateStrongPassword(),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Deletion modal / state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch admin & faculty users list
  const fetchUsers = async () => {
    setLoadingList(true);
    try {
      const { data } = await getAdminUsers();
      setUsers(data.users || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load administrator accounts.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegeneratePassword = () => {
    const newPwd = generateStrongPassword();
    setForm((prev) => ({ ...prev, password: newPwd }));
    toast.success('Generated new strong password!');
  };

  const handleCopyPassword = () => {
    if (!form.password) return;
    navigator.clipboard.writeText(form.password);
    setCopied(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!form.email.trim()) {
      toast.error('Please enter a valid email.');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createFacultyUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      toast.success(data.message || 'Faculty account created successfully!');
      // Reset form with a fresh new password
      setForm({
        name: '',
        email: '',
        password: generateStrongPassword(),
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create faculty account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data } = await deleteFacultyUser(deleteTarget._id);
      toast.success(data.message || 'Faculty account revoked.');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke account access.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const superAdminCount = users.filter((u) => u.role === 'super_admin' || u.role === 'admin').length;
  const facultyCount = users.filter((u) => u.role === 'faculty_admin').length;

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Add & Manage Users</h1>
                <p className="text-xs text-slate-500">Super Administrator Access Control & User Provisioning</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
              <Shield className="w-3.5 h-3.5" /> Super Admin Cockpit
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Administrators</p>
              <h3 className="text-2xl font-bold text-slate-800">{users.length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Super Admins</p>
              <h3 className="text-2xl font-bold text-purple-700">{superAdminCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Faculty Admins</p>
              <h3 className="text-2xl font-bold text-emerald-700">{facultyCount}</h3>
            </div>
          </div>
        </div>

        {/* Form Card: Create Faculty Member */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100/60 overflow-hidden">
          <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-primary-300">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Provision New Faculty Administrator</h2>
            </div>
            <p className="text-xs text-primary-200 max-w-2xl">
              Create an administrative login for faculty members. Faculty accounts have full permissions to schedule exams, manage question banks, review student submissions, and monitor live proctoring sessions.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Faculty Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="new-faculty-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Faculty Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="new-faculty-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. faculty@rguktn.ac.in"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Password Field with Generator & Copy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-primary-600 font-medium">Auto-generated strong password</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="new-faculty-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-all border border-slate-200 cursor-pointer"
                    title="Generate a new secure password"
                  >
                    <RefreshCw className="w-4 h-4" /> Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-semibold rounded-xl transition-all border border-primary-200 cursor-pointer"
                    title="Copy password to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Minimum 8 characters. The password can be manually customized or copied to share with the faculty member.
              </p>
            </div>

            {/* Email dispatch notice & Submit button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-2.5 text-xs text-slate-500">
                <Mail className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                <span>An automated invitation email containing these credentials will be sent to the faculty email upon creation.</span>
              </div>

              <button
                id="submit-add-faculty"
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Provisioning Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Faculty Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Accounts List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Existing Administrator Accounts</h2>
              <p className="text-xs text-slate-500">View and manage all active administrator privileges</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingList ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="spinner w-8 h-8" />
                <p className="text-xs font-medium">Loading administrator directory...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No administrator accounts found matching your query.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 text-xs uppercase font-semibold">
                    <th className="py-3.5 px-4 rounded-l-xl">Administrator</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSuper = u.role === 'super_admin' || u.role === 'admin';
                    return (
                      <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isSuper ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {u.name ? u.name[0]?.toUpperCase() : u.email[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{u.name || 'Faculty Member'}</p>
                              <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {isSuper ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                              <Shield className="w-3 h-3" /> Super Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                              <UserCheck className="w-3 h-3" /> Faculty Admin
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }) : '—'}
                        </td>

                        <td className="py-4 px-4 text-right">
                          {isSuper ? (
                            <span className="text-xs font-medium text-slate-400 italic">Root Admin</span>
                          ) : (
                            <button
                              id={`revoke-user-${u._id}`}
                              onClick={() => setDeleteTarget(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Revoke Access
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Revoking Access */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-slate-800 space-y-5 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold text-slate-800">Revoke Faculty Administrator Access?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to revoke access for{' '}
                  <strong className="text-slate-800">{deleteTarget.name}</strong> ({deleteTarget.email})? This action will permanently remove their administrative credentials.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-red-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {deleting ? <div className="spinner w-4 h-4" /> : 'Yes, Revoke'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AddUsers;
