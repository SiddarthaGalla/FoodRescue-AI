import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { apiRequest } from '../services/api';
import { slideUp } from '../animations/variants';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string } | null)?.resetToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      showToast('Missing reset session. Please request the OTP again.', 'error');
      navigate('/forgot-password');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, new_password: password }),
      });
      showToast('Password reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
        <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md space-y-6">
          <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-4 text-center">
            <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Invalid Reset Session</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This page can only be opened right after verifying the OTP on the Forgot Password page.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow"
            >
              Go to Forgot Password
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

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
                  placeholder=""
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
                  placeholder=""
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};