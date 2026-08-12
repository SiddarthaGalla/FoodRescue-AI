import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Target, Heart, Award, Users, Globe, Leaf } from 'lucide-react';
import { slideUp, cardHover } from '../animations/variants';

export const About: React.FC = () => {
  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
      
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
          Our Mission & Vision
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight">
          Pioneering AI Technology to Eradicate Hunger & Food Spoilage
        </h1>
        <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium leading-relaxed">
          FoodRescue AI bridges the gap between commercial food surplus and vulnerable populations using automated ML logistics, predictive expiry routing, and transparent real-time tracking.
        </p>
      </motion.div>

      {/* Hero Banner Photo */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl h-64 sm:h-96 border border-brand-500/20">
        <img 
          src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&auto=format&fit=crop&q=80" 
          alt="Community Food Rescue Mission" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6 sm:p-10">
          <div className="text-white space-y-1">
            <span className="px-3 py-1 text-xs font-bold bg-brand-600 rounded-full">Global Alliance</span>
            <h3 className="text-xl sm:text-3xl font-extrabold">Over 1.4 Million Hot Meals Delivered</h3>
          </div>
        </div>
      </div>

      {/* Core Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div whileHover="hover" variants={cardHover} className="p-8 rounded-3xl glass-card border border-brand-500/20 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Zero Waste Logistics</h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            Eliminating urban food waste at the source by enabling 30-second donor posts and intelligent routing.
          </p>
        </motion.div>

        <motion.div whileHover="hover" variants={cardHover} className="p-8 rounded-3xl glass-card border border-brand-500/20 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Uncompromising Quality</h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            Ensuring every donated meal passes rigorous digital temperature and safety guidelines before distribution.
          </p>
        </motion.div>

        <motion.div whileHover="hover" variants={cardHover} className="p-8 rounded-3xl glass-card border border-brand-500/20 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Dignified Relief</h3>
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
            Empowering shelter directors and community leaders with fresh, hot, nutritious meals every single day.
          </p>
        </motion.div>
      </div>

    </div>
  );
};
