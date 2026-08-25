import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, KeyRound, Send, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { apiRequest } from '../services/api';
import { COUNTRY_CODES, buildPhoneTarget } from '../lib/countryCodes';
import { slideUp } from '../animations/variants';

export const ForgotPassword: React.FC = () => {
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const [otpCountry, setOtpCountry] = useState('+91');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
      showToast('Password reset link sent to your email', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpPhone.trim()) {
      showToast('Please enter your mobile number', 'error');
      return;
    }
    const target = buildPhoneTarget(otpCountry, otpPhone);
    setIsSendingOTP(true);
    try {
      await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ target }),
      });
      setOtpSent(true);
      showToast(`Real-time OTP sent to ${target}! Check your mobile for the code.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      showToast('Please enter the 6-digit OTP code', 'error');
      return;
    }
    const target = buildPhoneTarget(otpCountry, otpPhone);
    setIsVerifying(true);
    try {
      const res = await apiRequest<{ reset_token: string }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ target, otp: otpCode, purpose: 'reset' }),
      });
      showToast('OTP verified! Set a new password.', 'success');
      navigate('/reset-password', { state: { resetToken: res.reset_token } });
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md space-y-6">
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-6">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-brand-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Forgot Password</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Recover your account by email or with a real-time OTP on your mobile.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-900/80 text-xs font-black">
            <button
              type="button"
              onClick={() => setMode('email')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'email' ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setMode('otp')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mode === 'otp' ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Mobile OTP
            </button>
          </div>

          {mode === 'email' ? (
            sent ? (
              <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center space-y-2">
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400">Recovery Email Dispatched!</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">
                  Check your inbox for instructions to reset your password for <span className="font-bold">{email}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                      placeholder=""
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Reset Link
                </button>
              </form>
            )
          ) : !otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                <div className="flex gap-2">
                  <select
                    value={otpCountry}
                    onChange={(e) => setOtpCountry(e.target.value)}
                    className="w-28 px-2 py-2.5 rounded-xl glass-input text-xs"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.value} value={c.value}>{c.value}</option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSendingOTP}
                className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSendingOTP ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {isSendingOTP ? 'Sending OTP...' : 'Send Real-time OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center text-xs font-bold text-gray-900 dark:text-white space-y-1">
                <p>Real-time OTP sent to <strong>{buildPhoneTarget(otpCountry, otpPhone)}</strong></p>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                  Enter the 6-digit code you received on your mobile. It expires in 5 minutes.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Enter 6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full text-center tracking-[0.5em] font-black text-xl py-2.5 rounded-xl glass-input border border-brand-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-1/3 py-3 text-xs font-bold glass-card rounded-xl border border-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-2/3 py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verify & Continue
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};