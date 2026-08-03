import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { apiRequest } from '../services/api';
import { slideUp } from '../animations/variants';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: 'demo-token', new_password: password }),
      });
      showToast('Password reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md space-y-6">
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Reset Password</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose a secure new password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
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

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Update Password
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
