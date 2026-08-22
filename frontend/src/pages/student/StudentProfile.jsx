import { useState, useEffect } from 'react';
import StudentLayout from '../../components/common/StudentLayout';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, getDomains, changePassword } from '../../api';
import toast from 'react-hot-toast';
import {
  User, BookOpen, CheckSquare, Square, Save, Tag,
  Edit2, X, GraduationCap, Hash, Mail, Award, Layers,
  Lock, KeyRound, CheckCircle2, ShieldCheck, AlertTriangle
} from 'lucide-react';

const StudentProfile = () => {
  const { user, login } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', cgpa: '' });
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [domainCategories, setDomainCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Load domains for the student's branch once
  useEffect(() => {
    if (user?.branch) {
      getDomains(user.branch)
        .then(({ data }) => setDomainCategories(data.categories || []))
        .catch(() => {});
    }
  }, [user?.branch]);

  // When entering edit mode, pre-fill form from current user
  const enterEdit = () => {
    setForm({ name: user?.name || '', cgpa: user?.cgpa || '' });
    setSelectedDomains(user?.domains || []);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const toggleDomain = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDomains || selectedDomains.length === 0) {
      toast.error('Please select at least one domain. A student must have at least one domain selected.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await updateProfile({
        name: form.name,
        cgpa: parseFloat(form.cgpa),
        domains: selectedDomains,
      });
      const token = localStorage.getItem('token');
      login(data.user, token);
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { data } = await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success(data.message || 'Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const yearLabel = (y) => {
    const suffixes = ['', 'st', 'nd', 'rd', 'th'];
    return y ? `${y}${suffixes[y] || 'th'} Year (B.Tech)` : '—';
  };

  return (
    <StudentLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your RGUKT student account</p>
          </div>
          {!editMode && (
            <div className="flex items-center gap-2">
              <button
                id="change-password-btn"
                onClick={() => setShowPasswordModal(true)}
                className="btn-secondary flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4 text-primary-600" /> Change Password
              </button>
              <button id="edit-profile-btn" onClick={enterEdit} className="btn-primary flex items-center gap-1.5">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-content max-w-2xl space-y-5">

        {/* ── VIEW MODE ─────────────────────────────────────── */}
        {!editMode && (
          <>
            {/* Identity card */}
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700 shrink-0">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-800">{user?.name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Hash,         label: 'Roll Number',   value: user?.rollNumber },
                    { icon: GraduationCap, label: 'Branch',        value: user?.branch },
                    { icon: Layers,       label: 'Year',          value: yearLabel(user?.year) },
                    { icon: BookOpen,     label: 'CGPA',          value: user?.cgpa ?? '—' },
                    { icon: Award,        label: 'Status',        value: user?.status === 'alumni' ? '🎓 Alumni' : '✅ Active' },
                    { icon: Mail,         label: 'Email',         value: user?.email },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                        <Icon className="w-4 h-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">{label}</p>
                        <p className="text-sm font-semibold text-slate-800">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Domains */}
            <div className={`card ${!user?.domains?.length ? 'border-amber-400 bg-amber-50/20' : ''}`}>
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-slate-800">Domains of Interest</h2>
                </div>
                {!user?.domains?.length && (
                  <span className="badge badge-yellow text-xs flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-3 h-3 text-amber-600" /> Required
                  </span>
                )}
              </div>
              <div className="card-body">
                {user?.domains?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.domains.map(d => (
                      <span key={d} className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-100">
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-100/60 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <p className="text-xs text-amber-900 font-medium">
                        No domains selected yet. You must select at least one domain.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={enterEdit}
                      className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shrink-0"
                    >
                      Select Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Security & Account Card */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-slate-800">Security & Password</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold hover:underline"
                >
                  Update Password
                </button>
              </div>
              <div className="card-body flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Account Password</p>
                    <p className="text-xs text-slate-400">Regularly updated passwords improve account security</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="btn-secondary btn-sm text-xs"
                >
                  Change
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── EDIT MODE ─────────────────────────────────────── */}
        {editMode && (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Basic editable fields */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <User className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-slate-800">Edit Details</h2>
              </div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="input-field" placeholder="Your name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CGPA</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="number" step="0.01" min="0" max="10" value={form.cgpa}
                        onChange={e => setForm({ ...form, cgpa: e.target.value })}
                        className="input-field pl-9" placeholder="8.5" required />
                    </div>
                  </div>
                </div>

                {/* Read-only info */}
                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                  {[
                    { label: 'Roll Number', value: user?.rollNumber },
                    { label: 'Branch',      value: user?.branch },
                    { label: 'Year',        value: yearLabel(user?.year) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Domain picker */}
            <div className={`card ${selectedDomains.length === 0 ? 'border-red-300 ring-2 ring-red-100' : ''}`}>
              <div className="card-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-slate-800">Domains of Interest</h2>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedDomains.length === 0 ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'
                }`}>
                  {selectedDomains.length === 0 ? '⚠️ At least 1 required' : `${selectedDomains.length} selected`}
                </span>
              </div>
              <div className="card-body">
                {domainCategories.length === 0 ? (
                  <div className="flex justify-center py-4"><div className="spinner w-5 h-5" /></div>
                ) : (
                  <div className="space-y-4">
                    {domainCategories.map(cat => (
                      <div key={cat.category}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{cat.category}</p>
                        <div className="flex flex-wrap gap-2">
                          {cat.domains.map(domain => {
                            const selected = selectedDomains.includes(domain);
                            return (
                              <button key={domain} type="button" onClick={() => toggleDomain(domain)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  selected
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300 hover:text-primary-600'
                                }`}>
                                {selected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                {domain}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDomains.length === 0 ? (
                  <p className="text-xs text-red-600 font-semibold mt-3 pt-3 border-t border-slate-100 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Please select at least one domain before saving.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    {selectedDomains.length} domain{selectedDomains.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving
                  ? <div className="spinner w-4 h-4" />
                  : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-slate-800 relative space-y-5 border border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Change Password</h3>
                  <p className="text-xs text-slate-500">Update your student account password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="•••••••• (min 6 characters)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary"
                  disabled={passwordSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {passwordSaving ? (
                    <>
                      <div className="spinner w-4 h-4" /> Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentProfile;
