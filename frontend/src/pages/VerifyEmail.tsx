import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { slideUp } from '../animations/variants';

export const VerifyEmail: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md space-y-6">
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/10 text-brand-500 flex items-center justify-center shadow-glow">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Email Address Verified!</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Your FoodRescue AI account is active and verified. You can now access full donor, shelter, and volunteer features.
          </p>
          <Link to="/login">
            <button className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2">
              <span>Proceed to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
