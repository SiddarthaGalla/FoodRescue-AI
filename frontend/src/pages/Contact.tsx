import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { slideUp } from '../animations/variants';

export const Contact: React.FC = () => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Your message has been sent successfully! Our support team will respond shortly.', 'success');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      <motion.div initial="hidden" animate="visible" variants={slideUp} className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">Get in Touch</h1>
        <p className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-200">
          Have questions about onboarding your enterprise, shelter, or volunteering network?
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl overflow-hidden shadow-lg h-44 border border-brand-500/20">
            <img 
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&auto=format&fit=crop&q=80" 
              alt="Dispatch Center" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">Official Support Email</p>
                <p className="text-xs font-extrabold text-gray-900 dark:text-white">support@foodrescueai.org</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">Dispatch Support Helpline</p>
                <p className="text-xs font-extrabold text-gray-900 dark:text-white">Support Helpdesk Channel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500">Global Operations Center</p>
                <p className="text-xs font-extrabold text-gray-900 dark:text-white">San Francisco, CA & Bangalore, IN</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="p-8 rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Full Name / Org Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  placeholder="Organization or Partner Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  placeholder="contact@organization.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                placeholder="Enterprise Onboarding Inquiry"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Message</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                placeholder="Tell us about your organization and food rescue goals..."
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
};
