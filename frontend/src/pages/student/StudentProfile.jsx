import { useState, useEffect } from 'react';
import StudentLayout from '../../components/common/StudentLayout';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, getDomains } from '../../api';
import toast from 'react-hot-toast';
import {
  User, BookOpen, CheckSquare, Square, Save, Tag,
  Edit2, X, GraduationCap, Hash, Mail, Award, Layers
} from 'lucide-react';

const StudentProfile = () => {
  const { user, login } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', cgpa: '' });
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [domainCategories, setDomainCategories] = useState([]);
  const [saving, setSaving] = useState(false);

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
    if (selectedDomains.length === 0) {
      toast.error('Please select at least one domain.');
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
            <button id="edit-profile-btn" onClick={enterEdit} className="btn-primary">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
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
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-slate-800">Domains of Interest</h2>
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
                  <p className="text-sm text-slate-400">No domains selected. Click Edit to add some.</p>
                )}
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
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary-600" />
                <h2 className="font-semibold text-slate-800">Domains of Interest</h2>
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
                {selectedDomains.length > 0 && (
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
    </StudentLayout>
  );
};

export default StudentProfile;
