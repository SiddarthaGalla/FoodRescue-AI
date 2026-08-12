import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Home as HomeIcon } from 'lucide-react';
import { slideUp } from '../animations/variants';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh-light dark:bg-mesh-dark">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="w-full max-w-md text-center space-y-6">
        <div className="p-8 rounded-3xl glass-card border border-brand-500/30 shadow-glow-lg space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/10 text-brand-500 flex items-center justify-center shadow-glow">
            <Leaf className="w-8 h-8 rotate-45" />
          </div>
          <h1 className="text-6xl font-black bg-gradient-to-r from-brand-600 to-emerald-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Page Not Found</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link to="/" className="inline-block pt-2">
            <button className="px-6 py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center gap-2">
              <HomeIcon className="w-4 h-4" />
              Return Home
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
