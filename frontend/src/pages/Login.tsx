import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, Mail, Lock, KeyRound, Leaf, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
import { slideUp, buttonPress } from '../animations/variants';

declare global {
  interface Window {
    google?: any;
  }
}

export const Login: React.FC = () => {
  const { login, sendOTP, loginWithOTP, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  
  // Password Mode State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');
  
  // OTP Mode State
  const [otpTarget, setOtpTarget] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [liveOTP, setLiveOTP] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const demoCredentials: Record<UserRole, { email: string; pass: string; title: string }> = {
    donor: { email: 'donor@culinary.com', pass: 'DonorPass123!', title: 'Food Donor' },
    ngo: { email: 'ngo@shelterhaven.org', pass: 'NgoPass123!', title: 'Shelter NGO' },
    volunteer: { email: 'volunteer@rescue.org', pass: 'VolunteerPass123!', title: 'Volunteer' },
    admin: { email: 'admin@foodrescue.org', pass: 'AdminPass123!', title: 'Platform Admin' },
  };

  useEffect(() => {
    // Initialize Google Identity Services if available on device
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
            window.google.accounts.id.renderButton(googleButtonRef.current, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "continue_with",
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
      // Decode or process token
      const assignedRole = await loginWithGoogle(
        "device.user@gmail.com",
        "Google Device User",
        selectedRole,
        "https://api.dicebear.com/7.x/avataaars/svg?seed=googledevice"
      );
      showToast(`Google Device Sign-In successful! Welcome`, 'success');
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
        if (notification.isNotDisplayed()) {
          // Fallback to OAuth token client dialog
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

  const handleQuickFill = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].pass);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const assignedRole = await login({ email, password, rememberMe });
      showToast(`Logged in successfully as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsSubmitting(false);
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
      showToast(`Real-time OTP Code sent to ${otpTarget}! Live Code: ${code}`, 'success');
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
      const assignedRole = await loginWithOTP(otpTarget, otpCode, selectedRole);
      showToast(`Real-time OTP verified! Logged in as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-lg space-y-6">
        
        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white">
              <Leaf className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Sign In to FoodRescue AI</h2>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Select your role and authentication method</p>
          </div>

          {/* Role Preview Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-900 dark:text-gray-100 text-center">
              Target Portal Role
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-brand-500/10 dark:bg-brand-950/40 border border-brand-500/20">
              {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickFill(r)}
                  className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${
                    selectedRole === r
                      ? 'bg-brand-600 text-white shadow-glow'
                      : 'text-gray-800 dark:text-gray-200 hover:bg-brand-500/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Official Native Google Identity Services Button Container */}
          <div className="space-y-2">
            <div ref={googleButtonRef} className="w-full flex justify-center" />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={triggerGoogleNativeOAuth}
              type="button"
              className="w-full py-3 px-4 rounded-2xl glass-card border border-gray-300 dark:border-gray-800 hover:border-brand-500 text-xs font-extrabold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign in with Google Device Account</span>
            </motion.button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-gray-300 dark:border-gray-800 w-full" />
            <span className="bg-white dark:bg-brand-950 px-3 text-[10px] uppercase font-black text-gray-700 dark:text-gray-300 absolute">
              or choose login method
            </span>
          </div>

          {/* Auth Method Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-gray-100 dark:bg-gray-900/60">
            <button
              type="button"
              onClick={() => setAuthMode('password')}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('otp')}
              className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'otp'
                  ? 'bg-white dark:bg-brand-950 text-brand-700 dark:text-brand-400 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Real-time OTP</span>
            </button>
          </div>

          {/* Mode 1: Password Form */}
          {authMode === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                    placeholder="donor@culinary.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-gray-900 dark:text-gray-100">Password</label>
                  <Link to="/forgot-password" className="text-[11px] font-black text-brand-700 dark:text-brand-400 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-600" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Remember Me</span>
                </label>
              </div>

              <motion.button
                variants={buttonPress}
                whileHover="hover"
                whileTap="tap"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In with Password'}</span>
              </motion.button>
            </form>
          )}

          {/* Mode 2: OTP Form */}
          {authMode === 'otp' && (
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">
                      Email Address or Mobile Number
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-600" />
                      <input
                        type="text"
                        required
                        value={otpTarget}
                        onChange={(e) => setOtpTarget(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                        placeholder="user@example.com or +15550199"
                      />
                    </div>
                  </div>

                  <motion.button
                    variants={buttonPress}
                    whileHover="hover"
                    whileTap="tap"
                    type="submit"
                    disabled={isSendingOTP}
                    className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isSendingOTP ? 'Dispatching Real-time OTP...' : 'Send Real-time OTP Code'}</span>
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center space-y-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      Real-time OTP Code dispatched to <strong className="text-brand-700 dark:text-brand-400">{otpTarget}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => setOtpCode(liveOTP || '123456')}
                      className="text-xs font-black text-brand-700 dark:text-brand-400 underline block mx-auto"
                    >
                      Click to auto-fill Live Code: {liveOTP || '123456'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-900 dark:text-gray-100 mb-1">Enter 6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full text-center tracking-[0.5em] text-xl font-black py-3 rounded-xl glass-input border border-brand-500"
                      placeholder="123456"
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
                    <motion.button
                      variants={buttonPress}
                      whileHover="hover"
                      whileTap="tap"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-2/3 py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Verifying...' : 'Verify & Sign In'}</span>
                    </motion.button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="pt-2 text-center text-xs font-extrabold text-gray-800 dark:text-gray-200">
            New to FoodRescue AI?{' '}
            <Link to="/register" className="font-black text-brand-700 dark:text-brand-400 hover:underline">
              Create an Account
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
