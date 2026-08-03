import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ShieldCheck, Zap, Leaf } from 'lucide-react';
import { slideUp } from '../animations/variants';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does FoodRescue AI match surplus food with shelters?',
      answer: 'Our proprietary machine learning algorithm evaluates food category, volume, prep timestamp, perishability window, distance to recipient shelters, and shelter dietary needs in real-time to dispatch the highest priority pickup.',
      icon: Zap,
    },
    {
      question: 'Is food safety guaranteed during transport?',
      answer: 'Yes! All donors verify digital temperature logs prior to dispatch. Volunteers transport meals in thermal-insulated containers, and NGOs complete mandatory QR verification upon arrival.',
      icon: ShieldCheck,
    },
    {
      question: 'How are tax deduction receipts generated for donors?',
      answer: 'Upon NGO scan-verification of delivery, the system automatically computes fair market value tax receipts and ESG carbon-offset certificates downloadable directly from your Donor Dashboard.',
      icon: Leaf,
    },
    {
      question: 'Who can volunteer as a transport driver?',
      answer: 'Anyone with a valid driver’s license, vehicle, and clean record can sign up via our Volunteer Hub. Real-time push notifications alert you to pickups near your commute.',
      icon: HelpCircle,
    },
    {
      question: 'Is FoodRescue AI free for Non-Profits and Shelters?',
      answer: '100% free forever for verified non-profit organizations, food banks, and community shelters.',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center space-y-3">
        <span className="px-4 py-1.5 rounded-full text-xs font-black bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
          Knowledge Base
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white">Frequently Asked Questions</h1>
        <p className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 max-w-xl mx-auto">
          Everything you need to know about our AI-driven food rescue platform.
        </p>
      </motion.div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const Icon = faq.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-3xl glass-card border border-brand-500/20 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{faq.question}</h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-brand-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 leading-relaxed border-t border-gray-200 dark:border-gray-800/60 pt-4"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
