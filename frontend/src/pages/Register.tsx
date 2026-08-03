import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, Phone, Leaf, Building2, Truck, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserRole } from '../types/auth';
import { slideUp, buttonPress } from '../animations/variants';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('donor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rolesList: { id: UserRole; title: string; desc: string; icon: any }[] = [
    { id: 'donor', title: 'Food Donor', desc: 'Restaurants, Hotels, Events', icon: Building2 },
    { id: 'ngo', title: 'Shelter / NGO', desc: 'Non-profits, Food Banks', icon: Shield },
    { id: 'volunteer', title: 'Volunteer Driver', desc: 'Logistics & Transport', icon: Truck },
    { id: 'admin', title: 'Platform Admin', desc: 'Operations Manager', icon: Leaf },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignedRole = await register({ name, email, phone, password, role });
      showToast(`Registration successful! Welcome to FoodRescue AI as a ${assignedRole.toUpperCase()}`, 'success');
      navigate(`/dashboard/${assignedRole}`);
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-lg space-y-6">
        
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow text-white">
              <Leaf className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Create FoodRescue Account</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Join our zero food waste ecosystem</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">Select Your Role</label>
            <div className="grid grid-cols-2 gap-2.5">
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
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-glow'
                        : 'border-gray-200/50 dark:border-gray-800/50 hover:bg-brand-500/5 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1 text-brand-500" />
                    <div>
                      <p className="text-xs font-bold">{r.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{r.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name / Org Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  placeholder="Green Bistro LLC"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    placeholder="contact@bistro.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
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
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Account...' : 'Register Account'}</span>
            </motion.button>
          </form>

          <div className="pt-2 text-center text-xs text-gray-500">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
