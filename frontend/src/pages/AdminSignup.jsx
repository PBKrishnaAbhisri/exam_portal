import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupAdmin } from '../api';
import toast from 'react-hot-toast';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';

const AdminSignup = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/@rguktn\.ac\.in$/i.test(form.email)) {
      toast.error('Admin email must be a @rguktn.ac.in address (e.g. faculty@rguktn.ac.in)');
      return;
    }

    setLoading(true);
    try {
      const { data } = await signupAdmin(form);
      login(data.user, data.token);
      toast.success('Admin account created!');
      navigate('/admin');
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: 'a-name', name: 'name', label: 'Full Name', type: 'text', placeholder: 'Dr. Jane Smith', Icon: User },
    { id: 'a-email', name: 'email', label: 'Email Address', type: 'email', placeholder: 'faculty@rguktn.ac.in', Icon: Mail },
    { id: 'a-password', name: 'password', label: 'Password', type: 'password', placeholder: '••••••••', Icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-primary-800/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary-700/15 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mb-4 border border-white/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Admin Registration</h1>
          <p className="text-slate-400 mt-1">Create a faculty/admin account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(({ id, name, label, type, placeholder, Icon }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input id={id} name={name} type={type} required value={form[name]}
                    onChange={(e) => setForm({ ...form, [name]: e.target.value })} placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/60 transition-all" />
                </div>
                {name === 'email' && (
                  <p className="text-slate-400 text-xs mt-1">Must be a @rguktn.ac.in email address</p>
                )}
              </div>
            ))}

            <button id="admin-signup-submit" type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-500 transition-all duration-200 shadow-lg disabled:opacity-60">
              {loading ? <div className="w-5 h-5 border-2 border-primary-300 border-t-white rounded-full animate-spin" /> : <>Create Admin Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
          <p className="text-center text-slate-400 text-sm mt-6">
            Already have an account? <Link to="/login" className="text-primary-300 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSignup;
