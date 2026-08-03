import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { slideUp } from '../animations/variants';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does FoodRescue AI guarantee food safety and hygiene compliance?',
      a: 'All food postings require digital temperature logging and perishability checks. Donors adhere to food safety guidelines under local Good Samaritan laws protecting food donors.',
    },
    {
      q: 'What types of food can be donated?',
      a: 'Prepared banquet meals, fresh produce, packaged goods, bakery surplus, and dairy items within safe consumption windows.',
    },
    {
      q: 'Are food donations eligible for tax deductions?',
      a: 'Yes! Automated tax receipts with verified meal count valuation are issued immediately upon delivery confirmation.',
    },
    {
      q: 'How do volunteers receive pickup assignments?',
      a: 'Volunteers receive real-time push alerts on their interactive dashboard with optimized routes based on proximity.',
    },
    {
      q: 'Is FoodRescue AI free for Non-Profit shelters?',
      a: '100% free forever for verified non-profits, shelters, and community kitchens.',
    },
  ];

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Frequently Asked Questions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Everything you need to know about our AI food rescue platform.
        </p>
      </motion.div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="rounded-2xl glass-card border border-brand-500/20 overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-gray-900 dark:text-white"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <span>{faq.q}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-200/40 dark:border-gray-800/40"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
