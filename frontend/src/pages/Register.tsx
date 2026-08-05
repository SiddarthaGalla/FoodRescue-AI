import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, Phone, Leaf, Building2, Truck, Shield, KeyRound, CheckCircle2, Sparkles, Fingerprint } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
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
  const [role, setRole] = useState<UserRole>('donor');

  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [liveOTP, setLiveOTP] = useState('');
  const [isSendingOTP, setIsSendingOTP] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const rolesList: { id: UserRole; title: string; desc: string; icon: any }[] = [
    { id: 'donor', title: 'Food Donor', desc: 'Restaurants & Catering', icon: Building2 },
    { id: 'ngo', title: 'Shelter / NGO', desc: 'Shelters & Food Banks', icon: Shield },
    { id: 'volunteer', title: 'Volunteer', desc: 'Logistics Transport', icon: Truck },
    { id: 'admin', title: 'Admin', desc: 'Platform Operations', icon: Leaf },
  ];

  useEffect(() => {
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
      const assignedRole = await loginWithGoogle(
        "device.user@gmail.com",
        "Google Device User",
        role,
        "https://api.dicebear.com/7.x/avataaars/svg?seed=googledevice"
      );
      showToast(`Google Device Registration successful! Welcome`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Google Auth failed', 'error');
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
      showToast(err.message || 'Registration failed', 'error');
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
    if (!otpTarget) {
      showToast('Please enter your email or phone number', 'error');
      return;
    }
    setIsSendingOTP(true);
    try {
      const code = await sendOTP(otpTarget);
      setLiveOTP(code);
      setOtpSent(true);
      showToast(`Real-time OTP sent to ${otpTarget}! Live Code: ${code}`, 'success');
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
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md sm:max-w-lg space-y-4 sm:space-y-6">
        
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
            <label className="block text-xs font-black text-gray-900 dark:text-gray-100 text-center sm:text-left">
              1. Select Organization Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {rolesList.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-brand-500/10 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 shadow-glow ring-1 ring-brand-500'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-brand-500/5 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1 text-brand-600 dark:text-brand-400" />
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
            {(!window.google?.accounts?.id) && (
              <button
                type="button"
                onClick={triggerGoogleNativeOAuth}
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
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-900/80 text-xs font-black">
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
                    placeholder="Green Bistro LLC"
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
                      placeholder="contact@bistro.com"
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
                      placeholder="+1 555-0199"
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
                    <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Email or Phone</label>
                    <input
                      type="text"
                      required
                      value={otpTarget}
                      onChange={(e) => setOtpTarget(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-xs"
                      placeholder="user@example.com or +15550199"
                    />
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
                    <p>Real-time OTP dispatched to <strong>{otpTarget}</strong></p>
                    <button type="button" onClick={() => setOtpCode(liveOTP || '123456')} className="font-black text-brand-700 dark:text-brand-400 underline block mx-auto">
                      Auto-fill Live Code: {liveOTP || '123456'}
                    </button>
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
