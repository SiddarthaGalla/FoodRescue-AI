import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LogIn, Mail, Lock, Sparkles, Leaf, ArrowRight, 
  Building2, Users, Truck, ShieldAlert 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
import { slideUp, buttonPress } from '../animations/variants';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoCredentials: Record<UserRole, { email: string; pass: string; title: string }> = {
    admin: { email: 'admin@foodrescue.org', pass: 'AdminPass123!', title: 'Platform Admin' },
    donor: { email: 'donor@culinary.com', pass: 'DonorPass123!', title: 'Food Donor' },
    ngo: { email: 'ngo@shelterhaven.org', pass: 'NgoPass123!', title: 'Shelter NGO' },
    volunteer: { email: 'volunteer@rescue.org', pass: 'VolPass123!', title: 'Volunteer' },
  };

  const handleQuickFill = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedRole = await login({ email, password, rememberMe });
      showToast(`Welcome back! Logged in as ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md space-y-6">
        
        {/* Glass Login Card */}
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-6">
          
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white">
              <Leaf className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Sign In to FoodRescue AI</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Access your role-specific dashboard</p>
          </div>

          {/* Quick Fill Role Selection Tabs */}
          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">
              Quick Preview Roles
            </p>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-brand-500/10 dark:bg-brand-950/40 border border-brand-500/20">
              {(['donor', 'ngo', 'volunteer', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickFill(r)}
                  className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${
                    selectedRole === r
                      ? 'bg-brand-600 text-white shadow-glow'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-brand-500/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Password</label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
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
                <span className="text-xs text-gray-600 dark:text-gray-400">Remember Me</span>
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
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
            </motion.button>
          </form>

          <div className="pt-2 text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
