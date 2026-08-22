import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendForgotPasswordOTP, resetPasswordWithOTP, resetStudentPassword } from '../api';
import toast from 'react-hot-toast';
import {
  GraduationCap, Mail, Lock, ArrowRight, ArrowLeft, KeyRound,
  Hash, ShieldCheck, CheckCircle2, RefreshCw, Send
} from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('otp'); // 'otp' | 'student-id'

  // Tab 1: OTP Flow
  const [otpStep, setOtpStep] = useState(1); // 1: Enter Email, 2: Enter OTP & New Password
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingOtp, setResettingOtp] = useState(false);
  const [devHint, setDevHint] = useState(null);

  // Tab 2: Student ID Flow
  const [idForm, setIdForm] = useState({
    email: '',
    rollNumber: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [idLoading, setIdLoading] = useState(false);

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail.trim()) {
      toast.error('Please enter your registered college email.');
      return;
    }
    setSendingOtp(true);
    setDevHint(null);
    try {
      const { data } = await sendForgotPasswordOTP({ email: otpEmail });
      toast.success(data.message || 'OTP sent to your email!');
      if (data.devHint) {
        setDevHint(data.devHint);
      }
      setOtpStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP. Check your email address.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle Verify OTP & Reset
  const handleResetWithOtp = async (e) => {
    e.preventDefault();
    if (otpNewPassword !== otpConfirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (otpNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    setResettingOtp(true);
    try {
      const { data } = await resetPasswordWithOTP({
        email: otpEmail,
        otp: otpCode,
        newPassword: otpNewPassword,
      });
      toast.success(data.message || 'Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setResettingOtp(false);
    }
  };

  // Handle Student ID Reset
  const handleStudentIdReset = async (e) => {
    e.preventDefault();
    if (idForm.newPassword !== idForm.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (idForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIdLoading(true);
    try {
      const { data } = await resetStudentPassword({
        email: idForm.email,
        rollNumber: idForm.rollNumber,
        newPassword: idForm.newPassword,
      });
      toast.success(data.message || 'Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please check your details.');
    } finally {
      setIdLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-700/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm mb-4 border border-white/20">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ExamPortal</h1>
          <p className="text-primary-200 mt-1">Account Recovery & Password Reset</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Reset Password</h2>
            <Link
              to="/login"
              className="text-xs text-primary-200 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-white/10 rounded-2xl border border-white/10 text-xs font-semibold text-primary-200">
            <button
              type="button"
              onClick={() => setActiveTab('otp')}
              className={`py-2 rounded-xl transition-all ${
                activeTab === 'otp' ? 'bg-white text-primary-900 shadow-md' : 'hover:text-white'
              }`}
            >
              Email OTP
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('student-id')}
              className={`py-2 rounded-xl transition-all ${
                activeTab === 'student-id' ? 'bg-white text-primary-900 shadow-md' : 'hover:text-white'
              }`}
            >
              Student Roll No.
            </button>
          </div>

          {/* TAB 1: EMAIL OTP FLOW */}
          {activeTab === 'otp' && (
            <div className="space-y-4">
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-200 mb-1.5">
                      Registered College Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                      <input
                        type="email"
                        required
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        placeholder="N######@rguktn.ac.in"
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                      />
                    </div>
                    <p className="text-xs text-primary-300 mt-1.5">
                      We will send a 6-digit verification code to this address.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg disabled:opacity-60 cursor-pointer"
                  >
                    {sendingOtp ? (
                      <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Verification Code
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetWithOtp} className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-primary-500/20 border border-primary-400/30 rounded-xl text-xs text-primary-100 flex items-center justify-between">
                    <span>
                      OTP sent to: <strong>{otpEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="text-white underline text-[11px]"
                    >
                      Change
                    </button>
                  </div>

                  {devHint && (
                    <div className="p-2.5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-xs text-amber-200">
                      Code: <strong className="font-mono">{devHint}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1.5">
                      6-Digit OTP Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full text-center py-2.5 font-mono text-xl tracking-widest bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1.5">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={otpNewPassword}
                        onChange={(e) => setOtpNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1.5">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={otpConfirmPassword}
                        onChange={(e) => setOtpConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={resettingOtp}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg disabled:opacity-60 cursor-pointer text-sm"
                    >
                      {resettingOtp ? (
                        <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Reset Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: STUDENT ID VERIFICATION FLOW */}
          {activeTab === 'student-id' && (
            <form onSubmit={handleStudentIdReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">
                  Student Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                  <input
                    type="email"
                    required
                    value={idForm.email}
                    onChange={(e) => setIdForm({ ...idForm, email: e.target.value })}
                    placeholder="N210782@rguktn.ac.in"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-200 mb-1.5">
                  Student Roll Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" />
                  <input
                    type="text"
                    required
                    value={idForm.rollNumber}
                    onChange={(e) => setIdForm({ ...idForm, rollNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. N210782"
                    className="w-full pl-10 pr-4 py-2.5 font-mono bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1.5">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={idForm.newPassword}
                    onChange={(e) => setIdForm({ ...idForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-primary-200 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={idForm.confirmPassword}
                    onChange={(e) => setIdForm({ ...idForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-primary-300 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={idLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg disabled:opacity-60 cursor-pointer text-sm"
              >
                {idLoading ? (
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Verify & Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          <div className="border-t border-white/10 pt-4 text-center">
            <Link to="/login" className="text-xs text-primary-200 hover:text-white transition-colors">
              Remember your password? <strong>Sign In</strong>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
