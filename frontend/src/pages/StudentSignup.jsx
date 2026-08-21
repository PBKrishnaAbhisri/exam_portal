import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupStudent } from '../api';
import toast from 'react-hot-toast';
import { GraduationCap, Mail, Lock, User, Hash, BookOpen, ArrowRight } from 'lucide-react';

const BRANCHES = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'CSD', 'OTHER'];

const StudentSignup = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', rollNumber: '', branch: '', year: '', cgpa: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await signupStudent(form);
      login(data.user, data.token);
      toast.success('Account created successfully!');
      navigate('/student');
    } catch (err) {
      const errors = err.response?.data?.errors;
      toast.error(errors?.[0]?.msg || err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-700/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-lg relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mb-4 border border-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Student Registration</h1>
          <p className="text-primary-200 mt-1">Create your exam portal account</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                  <input id="s-name" name="name" required value={form.name} onChange={handleChange} placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                  <input id="s-roll" name="rollNumber" required value={form.rollNumber} onChange={handleChange} placeholder="21CS001"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-200 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                <input id="s-email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@college.edu"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">Branch</label>
                <select id="s-branch" name="branch" required value={form.branch} onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all">
                  <option value="" className="bg-primary-900">Select</option>
                  {BRANCHES.map((b) => <option key={b} value={b} className="bg-primary-900">{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">Year</label>
                <select id="s-year" name="year" required value={form.year} onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all">
                  <option value="" className="bg-primary-900">Year</option>
                  {[1,2,3,4].map((y) => <option key={y} value={y} className="bg-primary-900">{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">CGPA</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                  <input id="s-cgpa" name="cgpa" type="number" step="0.01" min="0" max="10" required value={form.cgpa} onChange={handleChange} placeholder="8.5"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-200 mb-1.5">Password (min 6 chars)</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                <input id="s-password" name="password" type="password" required value={form.password} onChange={handleChange} placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all" />
              </div>
            </div>

            <button id="student-signup-submit" type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all duration-200 shadow-lg disabled:opacity-60 mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-700 rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-primary-200 text-sm mt-6">
            Already have an account? <Link to="/login" className="text-white font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentSignup;
