import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Send, Heart, ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      showToast('Thank you for subscribing to FoodRescue AI newsletter!', 'success');
      setEmail('');
    }
  };

  return (
    <footer className="relative mt-20 border-t border-brand-500/20 bg-gradient-to-b from-transparent via-brand-900/5 to-brand-950/20 dark:from-transparent dark:to-brand-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-glow text-white">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-brand-600 to-emerald-400 bg-clip-text text-transparent">
                FoodRescue AI
              </span>
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm">
              Empowering communities with AI-driven surplus food matching, routing, and real-time distribution to eliminate food waste and fight hunger globally.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium glass-card text-brand-600 dark:text-brand-400">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span>Verified Non-Profit Alliance</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Navigation</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link to="/" className="hover:text-brand-500 transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-brand-500 transition-colors">About Us</Link></li>
              <li><Link to="/how-it-works" className="hover:text-brand-500 transition-colors">How It Works</Link></li>
              <li><Link to="/contact" className="hover:text-brand-500 transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-brand-500 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* User Roles */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Portals</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><Link to="/login" className="hover:text-brand-500 transition-colors">Donor Portal</Link></li>
              <li><Link to="/login" className="hover:text-brand-500 transition-colors">NGO Dashboard</Link></li>
              <li><Link to="/login" className="hover:text-brand-500 transition-colors">Volunteer Hub</Link></li>
              <li><Link to="/login" className="hover:text-brand-500 transition-colors">Admin Console</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Stay Updated</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Subscribe to get real-time impact updates and regional rescue metrics.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs pr-10 focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all flex items-center justify-center shadow-glow"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-200/50 dark:border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} FoodRescue AI. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" />
            <span>for Zero Food Waste</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
