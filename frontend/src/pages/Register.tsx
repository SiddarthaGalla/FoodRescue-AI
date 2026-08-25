import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, Phone, Leaf, Building2, Truck, Shield, KeyRound, CheckCircle2, Sparkles, Fingerprint, ShieldAlert, UserCog, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { COUNTRY_CODES, buildPhoneTarget } from '../lib/countryCodes';
import { apiRequest } from '../services/api';
import { slideUp, buttonPress } from '../animations/variants';

declare global {
  interface Window {
    google?: any;
  }
}

// Kinde SSO is the primary sign-up path only when configured (matches the
// conditional KindeProvider in main.tsx); otherwise it stays hidden and the
// legacy form/OTP flows below remain the only options.
const kindeEnabled = !!import.meta.env.VITE_KINDE_DOMAIN && !!import.meta.env.VITE_KINDE_CLIENT_ID;

export const Register: React.FC = () => {
  const { register, sendOTP, loginWithOTP, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [regMode, setRegMode] = useState<'form' | 'otp'>('form');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [role, setRole] = useState<UserRole>(
    roleParam === 'admin' || roleParam === 'ngo' || roleParam === 'volunteer' || roleParam === 'donor'
      ? roleParam
      : 'donor'
  );

  const [otpTarget, setOtpTarget] = useState('');
  const [otpCountry, setOtpCountry] = useState('+91');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminAccessDenied, setAdminAccessDenied] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const isAdminAccessDenied = (err: any) =>
    typeof err?.message === 'string' && err.message.includes('approval from the platform owner');

  const requestAdminAccess = async () => {
    setRequestingAccess(true);
    try {
      await apiRequest<{ id: string }>('/admin/request', {
        method: 'POST',
        body: JSON.stringify({ email: googleAccountEmail || email || otpTarget || undefined, note: null }),
      });
      setRequestSent(true);
      showToast('Access request sent to the platform owner!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send access request', 'error');
    } finally {
      setRequestingAccess(false);
    }
  };

  const rolesList: { id: UserRole; title: string; desc: string; icon: any }[] = [
    { id: 'donor', title: 'Food Donor', desc: 'Restaurants & Catering', icon: Building2 },
    { id: 'ngo', title: 'Shelter / NGO', desc: 'Shelters & Food Banks', icon: Shield },
    { id: 'volunteer', title: 'Volunteer', desc: 'Logistics Transport', icon: Truck },
    { id: 'admin', title: 'Admin', desc: 'Platform Operations', icon: Leaf },
  ];

  useEffect(() => {
    if (supabaseEnabled) return;

    const initGoogleGIS = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: "1098485292418-demo.apps.googleusercontent.com",
            callback: (response: any) => {
              handleGoogleCredentialResponse(response);
            },
            auto_select: false,
          });

          if (googleButtonRef.current) {
            googleButtonRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signup_with",
              shape: "pill",
            });
          }
        } catch (err) {
          console.log("Google GIS initialized");
        }
      }
    };

    initGoogleGIS();
    const timer = setTimeout(initGoogleGIS, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    setIsSubmitting(true);
    try {
      if (!response?.credential) {
        showToast('Google sign-in did not return an account. Please try again.', 'error');
        return;
      }
      let email = '';
      let name = 'Google User';
      let picture = '';
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        email = payload.email || '';
        name = payload.name || (payload.given_name ? `${payload.given_name} ${payload.family_name || ''}`.trim() : name);
        picture = payload.picture || picture;
      } catch (e) {
        console.warn('Failed to decode Google credential', e);
      }
      if (!email) {
        showToast('Google sign-in did not return an account. Please try again.', 'error');
        return;
      }
      setGoogleAccountEmail(email);
      if (supabaseEnabled) {
        await handleSupabaseGoogle();
        return;
      }
      const assignedRole = await loginWithGoogle(email, name, role, picture);
      showToast(`Google Device Registration successful! Welcome`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        setAdminAccessDenied(true);
      } else {
        showToast(err.message || 'Google Auth failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupabaseGoogle = async () => {
    setIsSubmitting(true);
    try {
      const assignedRole = await loginWithGoogle('', '', role);
      showToast(`Google Registration successful! Welcome`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        try {
          const { data } = await supabase!.auth.getSession();
          if (data.session?.user?.email) setGoogleAccountEmail(data.session.user.email);
        } catch (e) { /* ignore */ }
        setAdminAccessDenied(true);
      } else {
        showToast(err.message || 'Google Auth failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerGoogleNativeOAuth = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          if (window.google?.accounts?.oauth2) {
            const client = window.google.accounts.oauth2.initCodeClient({
              client_id: '1098485292418-demo.apps.googleusercontent.com',
              scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
              ux_mode: 'popup',
              callback: (response: any) => {
                handleGoogleCredentialResponse(response);
              },
            });
            client.requestCode();
          } else {
            handleGoogleCredentialResponse({});
          }
        }
      });
    } else {
      handleGoogleCredentialResponse({});
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill in required fields', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const assignedRole = await register({ name, email, phone, password, role });
      showToast(`Account created! Welcome to FoodRescue AI as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        setAdminAccessDenied(true);
      } else {
        showToast(err.message || 'Registration failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKindeRegister = async () => {
    try {
      // Triggers the Kinde hosted sign-up redirect; session is synced on return.
      await register({});
    } catch (err: any) {
      showToast(err.message || 'Kinde sign-up failed', 'error');
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }
    if (!otpPhone.trim()) {
      showToast('Please enter your mobile number', 'error');
      return;
    }
    const target = buildPhoneTarget(otpCountry, otpPhone);
    setOtpTarget(target);
    setIsSendingOTP(true);
    try {
      await sendOTP(target);
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
    setIsSubmitting(true);
    try {
      const assignedRole = await loginWithOTP(otpTarget, otpCode, role, name);
      showToast(`Verified via OTP! Welcome ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        setAdminAccessDenied(true);
      } else {
        showToast(err.message || 'OTP verification failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md sm:max-w-xl space-y-4 sm:space-y-6 mx-auto">
        
        {/* Glossy Register Card */}
        <div className="p-4 sm:p-8 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-5 sm:space-y-6">
          
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 text-[10px] sm:text-xs font-black border border-brand-500/20 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
              <span>Join FoodRescue AI Network</span>
            </div>
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Create Your Account</h2>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Empowering surplus food rescue in real-time</p>
          </div>

          {/* Role Selector Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-900 dark:text-gray-100 text-center">
              1. Select Organization Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {rolesList.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRole(r.id);
                      setAdminAccessDenied(false);
                      setRequestSent(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-brand-500/10 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 shadow-glow ring-1 ring-brand-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-brand-500/5 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1.5 text-brand-600 dark:text-brand-400" />
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white">{r.title}</p>
                      <p className="text-[9px] font-bold text-gray-600 dark:text-gray-400">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kinde SSO — primary path when configured */}
          {kindeEnabled && (
            <div className="space-y-2">
              <motion.button
                variants={buttonPress}
                whileHover="hover"
                whileTap="tap"
                type="button"
                onClick={handleKindeRegister}
                className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Sign up with Kinde</span>
              </motion.button>
              <p className="text-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                Powered by Kinde
              </p>
            </div>
          )}

          {/* Single Official Native Google Identity Services Button */}
          <div className="space-y-2">
            <div ref={googleButtonRef} className="w-full flex justify-center" />
            {(supabaseEnabled || !window.google?.accounts?.id) && (
              <button
                type="button"
                onClick={supabaseEnabled ? handleSupabaseGoogle : triggerGoogleNativeOAuth}
                className="w-full py-3 px-4 rounded-full glass-card border border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-extrabold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Register with Google</span>
              </button>
            )}
          </div>

          {/* Registration Mode Segment Control */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-900/80 text-xs font-black">
            <button
              type="button"
              onClick={() => setRegMode('form')}
              className={`py-2.5 rounded-xl transition-all ${
                regMode === 'form' ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Standard Form
            </button>
            <button
              type="button"
              onClick={() => setRegMode('otp')}
              className={`py-2.5 rounded-xl transition-all ${
                regMode === 'otp' ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Email / Phone OTP
            </button>
          </div>

          {/* Form Content */}
          {regMode === 'form' ? (
            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Full Name / Org Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                    placeholder=""
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                      placeholder=""
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <motion.button
                variants={buttonPress}
                whileHover="hover"
                whileTap="tap"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Register Account'}</span>
              </motion.button>
            </form>
          ) : (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                        placeholder=""
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Mobile Number</label>
                    <div className="flex gap-2">
                      <select
                        value={otpCountry}
                        onChange={(e) => setOtpCountry(e.target.value)}
                        className="w-28 px-2 py-3 rounded-xl glass-input text-xs"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.value} value={c.value}>{c.value}</option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                          type="tel"
                          required
                          value={otpPhone}
                          onChange={(e) => setOtpPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                          placeholder=""
                        />
                      </div>
                    </div>
                  </div>
                  <motion.button
                    variants={buttonPress}
                    whileHover="hover"
                    type="submit"
                    disabled={isSendingOTP}
                    className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow"
                  >
                    {isSendingOTP ? 'Dispatching OTP...' : 'Send OTP Verification Code'}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center text-xs font-bold text-gray-900 dark:text-white space-y-1">
                    <p>Real-time OTP sent to <strong>{otpTarget}</strong></p>
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      Enter the 6-digit code you received on your mobile. It expires in 5 minutes.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-black mb-1 text-gray-900 dark:text-white">Enter 6-Digit Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full text-center tracking-[0.5em] font-black text-xl py-3 rounded-xl glass-input border border-brand-500"
                    />
                  </div>
                  <motion.button
                    variants={buttonPress}
                    whileHover="hover"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 text-xs font-black text-white bg-brand-600 rounded-2xl shadow-glow flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Create Account</span>
                  </motion.button>
                </form>
              )}
            </div>
          )}

          {/* Admin Access Denied Panel */}
          {adminAccessDenied && role === 'admin' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-rose-600 dark:text-rose-400">
                    You don't have admin access
                  </p>
                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                    This account is not allowed to use the admin portal. Send an access request to the platform
                    owner — once they approve it, you can sign in choosing the Admin role.
                  </p>
                </div>
              </div>
              {requestSent ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Request sent! The platform owner will review it and you'll get access after approval.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={requestAdminAccess}
                  disabled={requestingAccess}
                  className="w-full py-2.5 text-[11px] font-black uppercase rounded-xl bg-brand-600 text-white shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {requestingAccess ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCog className="w-4 h-4" />
                  )}
                  {requestingAccess ? 'Sending...' : 'Request Admin Access'}
                </button>
              )}
            </div>
          )}

          {/* Footer Link */}
          <div className="pt-2 text-center text-xs font-extrabold text-gray-800 dark:text-gray-200">
            Already registered?{' '}
            <Link to="/login" className="font-black text-brand-700 dark:text-brand-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
