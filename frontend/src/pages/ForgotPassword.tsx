import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { apiRequest } from '../services/api';
import { slideUp } from '../animations/variants';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
              Enter your email address to receive password recovery instructions.
            </p>
          </div>

          {sent ? (
            <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-center space-y-2">
              <p className="text-xs font-bold text-brand-600 dark:text-brand-400">Recovery Email Dispatched!</p>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Check your inbox for instructions to reset your password for <span className="font-bold">{email}</span>.
              </p>
            </div>
          ) : (
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

              <button
                type="submit"
                className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Reset Link
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
