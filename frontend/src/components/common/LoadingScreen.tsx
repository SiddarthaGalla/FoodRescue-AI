import React from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bgLight dark:bg-bgDark backdrop-blur-xl">
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-brand-500 to-emerald-400 flex items-center justify-center shadow-glow-lg text-white"
      >
        <Leaf className="w-9 h-9 animate-pulse" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-base font-extrabold bg-gradient-to-r from-brand-600 to-emerald-400 bg-clip-text text-transparent"
      >
        FoodRescue AI
      </motion.h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium animate-pulse">
        Initializing AI Engine...
      </p>
    </div>
  );
};
