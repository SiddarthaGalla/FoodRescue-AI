import React from 'react';
import { motion } from 'framer-motion';
import { Package, Cpu, Truck, Building2 } from 'lucide-react';
import { slideUp, cardHover } from '../animations/variants';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      title: '1. Instant Food Donation Listing',
      desc: 'Commercial kitchens, caterers, or grocery outlets post excess items with quantity, diet type, and estimated expiry time.',
      icon: Package,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: '2. AI Machine Learning Matching',
      desc: 'Our engine computes travel distances, shelter capacity, and dietary preferences to select the highest-impact recipient.',
      icon: Cpu,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: '3. Optimized Dispatch & Pickup',
      desc: 'Nearby verified volunteer drivers accept the batch via push notification and follow live optimized GPS routes.',
      icon: Truck,
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: '4. Safe Delivery & Tax Receipts',
      desc: 'NGOs scan QR receipt codes on arrival. Automated tax deduction certificates are generated instantly for donors.',
      icon: Building2,
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center max-w-3xl mx-auto space-y-4">
        <span className="px-4 py-1.5 rounded-full text-xs font-extrabold bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
          Step-by-Step Architecture
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight">
          How FoodRescue AI Redistributes Surplus Food in Under 45 Minutes
        </h1>
        <p className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200">
          A seamless digital ecosystem connecting donors, volunteers, and shelters.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div key={idx} whileHover="hover" variants={cardHover} className="rounded-3xl glass-card border border-brand-500/20 overflow-hidden flex flex-col justify-between">
              <div className="h-48 relative overflow-hidden">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-lg">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{s.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
