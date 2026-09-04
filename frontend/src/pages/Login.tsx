import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogIn, Mail, Lock, KeyRound, Leaf, CheckCircle2, Sparkles, Fingerprint,
  ShieldAlert, UserCog, Loader2, User, Phone, Send, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
import { apiRequest } from '../services/api';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { COUNTRY_CODES, buildPhoneTarget } from '../lib/countryCodes';
import { slideUp, buttonPress } from '../animations/variants';

declare global {
  interface Window {
    google?: any;
  }
}

// Kinde SSO is the primary login path only when configured (matches the
// conditional KindeProvider in main.tsx); otherwise it stays hidden and the
// legacy forms below remain the only options.
const kindeEnabled = !!import.meta.env.VITE_KINDE_DOMAIN && !!import.meta.env.VITE_KINDE_CLIENT_ID;

export const Login: React.FC = () => {
  const { user, login, dummyLogin, sendOTP, loginWithOTP, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');

  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  
  // Password Mode State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    roleParam === 'admin' || roleParam === 'ngo' || roleParam === 'volunteer' || roleParam === 'donor'
      ? roleParam
      : 'donor'
  );
  
  // OTP Mode State
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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqCountry, setReqCountry] = useState('+1');
  const [reqEmail, setReqEmail] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const countryCodes = [
    '+1', '+44', '+91', '+971', '+61', '+49', '+33', '+353', '+65', '+81',
    '+86', '+234', '+27', '+55', '+62', '+63', '+66', '+92', '+880', '+966',
  ];

  const isAdminAccessDenied = (err: any) =>
    selectedRole === 'admin' && typeof err?.message === 'string' && err.message.includes('approval from the platform owner');

  const openRequestModal = () => {
    setReqEmail(googleAccountEmail || email || otpTarget || '');
    setReqName('');
    setReqPhone('');
    setRequestSent(false);
    // Do NOT set adminAccessDenied here — only real auth denials should trigger the panel
    setShowRequestModal(true);
  };

  const submitAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqName.trim() || !reqEmail.trim() || !reqPhone.trim()) {
      showToast('Please fill in your name, phone, and email', 'error');
      return;
    }
    setRequestingAccess(true);
    try {
      await apiRequest<{ id: string }>('/admin/request', {
        method: 'POST',
        body: JSON.stringify({
          email: reqEmail.trim().toLowerCase(),
          name: reqName.trim(),
          phone: `${reqCountry} ${reqPhone.trim()}`,
          note: null,
        }),
      });
      setShowRequestModal(false);
      setRequestSent(true);
      setAdminAccessDenied(true);
      showToast('Access request sent to the platform owner!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send access request', 'error');
    } finally {
      setRequestingAccess(false);
    }
  };

  useEffect(() => {
    if (supabaseEnabled && user) {
      // Don't bounce while a Google OAuth flow is in flight (pending role saved
      // before the redirect) or while an admin denial is showing — let those
      // resolve first so the chosen role's page is what appears.
      if (localStorage.getItem('pendingSupabaseRole') || adminAccessDenied) return;
      navigate(`/dashboard/${user.role}`, { replace: true });
    }
  }, [user, adminAccessDenied]);

  // Coming back from the Google redirect: the supabase session exists but our
  // backend rejected the admin role. Surface the denial as the inline panel
  // instead of silently staying/redirecting.
  useEffect(() => {
    if (!supabaseEnabled || user || !supabase) return;
    const pending = localStorage.getItem('pendingSupabaseRole') as UserRole | null;
    if (!pending) return;
    const sb = supabase;
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      loginWithGoogle('', '', pending)
        .then((role) => navigate(`/dashboard/${role}`))
        .catch((err: any) => {
          if (
            pending === 'admin' &&
            typeof err?.message === 'string' &&
            err.message.includes('approval from the platform owner')
          ) {
            if (data.session?.user?.email) setGoogleAccountEmail(data.session.user.email);
            localStorage.removeItem('pendingSupabaseRole');
            // Drop any stale app session so the login page stays put
            localStorage.removeItem('foodrescue_user');
            localStorage.removeItem('foodrescue_token');
            sessionStorage.removeItem('foodrescue_user');
            sessionStorage.removeItem('foodrescue_token');
            setSelectedRole('admin');
            setAdminAccessDenied(true);
          } else {
            localStorage.removeItem('pendingSupabaseRole');
            showToast(err.message || 'Google sign-in failed', 'error');
          }
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-switch to Password mode when Admin role is selected (OTP not allowed for admin)
  useEffect(() => {
    if (selectedRole === 'admin' && authMode === 'otp') {
      setAuthMode('password');
    }
  }, [selectedRole]);

  const demoCredentials: Record<UserRole, { email: string; pass: string; title: string }> = {
    donor: { email: 'donor@culinary.com', pass: 'DonorPass123!', title: 'Food Donor' },
    ngo: { email: 'ngo@shelterhaven.org', pass: 'NgoPass123!', title: 'Shelter NGO' },
    volunteer: { email: 'volunteer@rescue.org', pass: 'VolunteerPass123!', title: 'Volunteer' },
    admin: { email: 'admin@foodrescue.org', pass: 'AdminPass123!', title: 'Platform Admin' },
  };

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
      const assignedRole = await loginWithGoogle(email, name, selectedRole, picture);
      showToast(`Google Sign-In successful! Welcome ${name}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        localStorage.removeItem('pendingSupabaseRole');
        localStorage.removeItem('foodrescue_user');
        localStorage.removeItem('foodrescue_token');
        setSelectedRole('admin');
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
      const assignedRole = await loginWithGoogle('', '', selectedRole);
      showToast(`Google Sign-In successful!`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      if (isAdminAccessDenied(err)) {
        try {
          const { data } = await supabase!.auth.getSession();
          if (data.session?.user?.email) setGoogleAccountEmail(data.session.user.email);
        } catch (e) { /* ignore */ }
        localStorage.removeItem('pendingSupabaseRole');
        localStorage.removeItem('foodrescue_user');
        localStorage.removeItem('foodrescue_token');
        setSelectedRole('admin');
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
              client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1098485292418-demo.apps.googleusercontent.com',
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
    setAdminAccessDenied(false);
    setRequestSent(false);
    setGoogleAccountEmail('');
  };

  const handleInstantDemoLogin = async (role: UserRole) => {
    setIsSubmitting(true);
    try {
      const assignedRole = await dummyLogin(role, demoCredentials[role].title);
      showToast(`Logged in as ${demoCredentials[role].title} (${assignedRole.toUpperCase()})`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
      if (isAdminAccessDenied(err)) setAdminAccessDenied(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKindeLogin = async () => {
    try {
      // Triggers the Kinde hosted login redirect; session is synced on return.
      await login({});
    } catch (err: any) {
      showToast(err.message || 'Kinde login failed', 'error');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const assignedRole = await login({ email, password, rememberMe, role: selectedRole });
      showToast(`Logged in successfully as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
      if (isAdminAccessDenied(err)) setAdminAccessDenied(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const assignedRole = await loginWithOTP(otpTarget, otpCode, selectedRole);
      showToast(`Real-time OTP verified! Logged in as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'OTP verification failed', 'error');
      if (isAdminAccessDenied(err)) setAdminAccessDenied(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md sm:max-w-lg space-y-4 sm:space-y-6">
        
        {/* Main Glossy Card */}
        <div className="p-4 sm:p-8 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-5 sm:space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 text-[10px] sm:text-xs font-black border border-brand-500/20 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
              <span>FoodRescue AI Portal</span>
            </div>
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white">
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">Sign In to FoodRescue AI</h2>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Select your role and authentication method</p>
          </div>

          {/* Role Target Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider text-gray-900 dark:text-gray-100">
              <span className="uppercase">TARGET PORTAL ROLE</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-900/60 border border-brand-500/20">
              {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r);
                    setAdminAccessDenied(false);
                  }}
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

          {/* Kinde SSO — primary path when configured */}
          {kindeEnabled && (
            <div className="space-y-2">
              <motion.button
                variants={buttonPress}
                whileHover="hover"
                whileTap="tap"
                type="button"
                onClick={handleKindeLogin}
                className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                <span>Continue with Kinde</span>
              </motion.button>
              <p className="text-center text-[10px] font-bold text-gray-500 dark:text-gray-400">
                Powered by Kinde
              </p>
            </div>
          )}

          {/* Single Official Google Identity Services Button */}
          <div className="space-y-2">
            {supabaseEnabled ? (
              <button
                type="button"
                onClick={handleSupabaseGoogle}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-full glass-card border border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-black text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
              </button>
            ) : (
              <>
                <div ref={googleButtonRef} className="w-full flex justify-center" />
                {!window.google?.accounts?.id && (
                  <button
                    type="button"
                    onClick={triggerGoogleNativeOAuth}
                    className="w-full py-3 px-4 rounded-full glass-card border border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-black text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                )}
              </>
            )}
          </div>

          {selectedRole !== 'admin' && (
            <>
              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-gray-300 dark:border-gray-800 w-full" />
                <span className="bg-white dark:bg-brand-950 px-3 text-[10px] uppercase font-black text-gray-700 dark:text-gray-300 absolute">
                  OR CHOOSE LOGIN METHOD
                </span>
              </div>

              {/* Auth Method Switcher Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-900/60">
                <button
                  type="button"
                  onClick={() => setAuthMode('password')}
                  className={`py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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
                  className={`py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
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
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600" />
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-black text-gray-900 dark:text-gray-100">Password</label>
                      <Link to="/forgot-password" className="text-[11px] font-black text-brand-700 dark:text-brand-400 hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
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
                    className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
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
                          Mobile Number
                        </label>
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
                            <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-600" />
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
                        whileTap="tap"
                        type="submit"
                        disabled={isSendingOTP}
                        className="w-full py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>{isSendingOTP ? 'Dispatching Real-time OTP...' : 'Send Real-time OTP Code'}</span>
                      </motion.button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center space-y-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          Real-time OTP Code sent to <strong className="text-brand-700 dark:text-brand-400">{otpTarget}</strong>
                        </p>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                          Enter the 6-digit code you received on your mobile. It expires in 5 minutes.
                        </p>
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
                          placeholder=""
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
                          className="w-2/3 py-3.5 text-xs font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isSubmitting ? 'Verifying...' : 'Verify & Sign In'}</span>
                        </motion.button>
                      </div>
                    </form>
                  )}
                </div>
              )}
</>
            )}

          {/* Admin Access Denied Panel */}
          {(requestSent || adminAccessDenied) && selectedRole === 'admin' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              {requestSent ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Request sent! The platform owner will review it and you'll get access after approval.
                </div>
              ) : (
                <>
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
                  <button
                    type="button"
                    onClick={openRequestModal}
                    className="w-full py-2.5 text-[11px] font-black uppercase rounded-xl bg-brand-600 text-white shadow-glow flex items-center justify-center gap-2"
                  >
                    <UserCog className="w-4 h-4" />
                    Request Admin Access
                  </button>
                </>
              )}
            </div>
          )}

          <div className="pt-2 text-center text-xs font-extrabold text-gray-800 dark:text-gray-200">
            {selectedRole === 'admin' ? (
              <button
                type="button"
                onClick={openRequestModal}
                className="inline-flex items-center gap-1.5 font-black text-brand-700 dark:text-brand-400 hover:underline"
              >
                <UserCog className="w-3.5 h-3.5" />
                Request Admin Access
              </button>
            ) : (
              <>
                New to FoodRescue AI?{' '}
                <Link to={`/register?role=${selectedRole}`} className="font-black text-brand-700 dark:text-brand-400 hover:underline">
                  Create an Account
                </Link>
              </>
            )}
          </div>
        </div>

      </motion.div>

      {/* Request Admin Access Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Request Admin Access
              </h3>
              <button type="button" onClick={() => setShowRequestModal(false)} className="p-1.5 rounded-lg glass-card">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              Fill in your details below and the platform owner will review your request.
            </p>

            <form onSubmit={submitAdminRequest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={reqName}
                    onChange={(e) => setReqName(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={reqCountry}
                    onChange={(e) => setReqCountry(e.target.value)}
                    className="w-24 px-2 py-3 rounded-xl glass-input text-xs"
                  >
                    {countryCodes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      required
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Gmail / Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-3 rounded-xl glass-card font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestingAccess}
                  className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {requestingAccess ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {requestingAccess ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
