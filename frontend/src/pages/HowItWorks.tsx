import React from 'react';
import { motion } from 'framer-motion';
import { Package, Cpu, Truck, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { slideUp, cardHover } from '../animations/variants';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      title: '1. Instant Food Donation Listing',
      desc: 'Commercial kitchens, caterers, or grocery outlets post excess items with quantity, diet type, and estimated expiry time.',
      icon: Package,
    },
    {
      title: '2. AI Machine Learning Matching',
      desc: 'Our engine computes travel distances, shelter capacity, and dietary preferences to select the highest-impact recipient.',
      icon: Cpu,
    },
    {
      title: '3. Optimized Dispatch & Pickup',
      desc: 'Nearby verified volunteer drivers accept the batch via push notification and follow live optimized GPS routes.',
      icon: Truck,
    },
    {
      title: '4. Safe Delivery & Tax Receipts',
      desc: 'NGOs scan QR receipt codes on arrival. Automated tax deduction certificates are generated instantly for donors.',
      icon: Building2,
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
          Step-by-Step Architecture
        </span>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
          How FoodRescue AI Redistributes Surplus Food in Under 45 Minutes
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          A seamless digital ecosystem connecting donors, volunteers, and shelters.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-8 rounded-3xl glass-card border border-brand-500/20 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-glow">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{s.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
