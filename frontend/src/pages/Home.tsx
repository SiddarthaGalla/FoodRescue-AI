import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, ShieldCheck, HeartHandshake, Truck, 
  Building2, Users, TrendingUp, CheckCircle, Star, Award, 
  MapPin, Clock, Cpu, Leaf, ChevronRight
} from 'lucide-react';
import { fadeIn, slideUp, staggerContainer, cardHover, buttonPress, floatingAnimation } from '../animations/variants';

export const Home: React.FC = () => {
  const stats = [
    { label: 'Meals Rescued', value: '1,450,000+', icon: Leaf, change: '+24% this month' },
    { label: 'Partner NGOs', value: '890+', icon: Building2, change: 'Across 45 cities' },
    { label: 'CO₂ Offset', value: '520 Tons', icon: TrendingUp, change: 'Equivalent to 25k trees' },
    { label: 'Active Volunteers', value: '3,400+', icon: Users, change: 'Avg 18min response' },
  ];

  const features = [
    {
      icon: Cpu,
      title: 'AI Matchmaking Engine',
      description: 'Predicts food perishability, nutritional balance, and pairs surplus food with nearest verified shelters instantly.',
    },
    {
      icon: Truck,
      title: 'Dynamic Route Dispatch',
      description: 'Generates optimal, low-emission pickup routes for volunteers to guarantee hot meal delivery in under 45 minutes.',
    },
    {
      icon: ShieldCheck,
      title: 'Food Quality Verification',
      description: 'Integrated digital temperature checks and safety protocol validation before any food batch dispatch.',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Impact Analytics',
      description: 'Comprehensive ESG dashboards for enterprise donors showing carbon offset, tax deductions, and meals donated.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Post Surplus Food',
      desc: 'Restaurants, hotels, or events log excess items via our 30-second AI quick-scan portal.',
      role: 'Donors',
    },
    {
      step: '02',
      title: 'AI Priority Dispatch',
      desc: 'Algorithm matches item shelf-life with nearby shelter demand and routes nearest volunteer.',
      role: 'System',
    },
    {
      step: '03',
      title: 'Rapid Temperature Pick-up',
      desc: 'Volunteers pick up insulated containers with live GPS routing and QR verification.',
      role: 'Volunteers',
    },
    {
      step: '04',
      title: 'Dignified Distribution',
      desc: 'Shelters receive fresh meals, auto-updating donor tax credits and ESG reports.',
      role: 'NGOs',
    },
  ];

  const testimonials = [
    {
      name: 'Chef Marcus Vance',
      role: 'Executive Director, Horizon Culinary Group',
      image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
      text: 'FoodRescue AI transformed how our 5-star hotel manages surplus banquet meals. We rescued 14,000 hot meals last quarter effortlessly.',
    },
    {
      name: 'Elena Rostova',
      role: 'Director, Hope Community Haven NGO',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      text: 'The AI notification system alerts us 2 hours before food arrives. It has increased our meal distribution efficiency by over 300%.',
    },
    {
      name: 'David Chen',
      role: 'Lead Volunteer Driver',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'The route optimization app makes food rescue seamless during my evening commute. Every delivery feels directly impactful.',
    },
  ];

  return (
    <div className="relative overflow-hidden bg-mesh-light dark:bg-mesh-dark transition-colors duration-300">
      
      {/* Background Decorative Glowing Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 right-10 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="lg:col-span-7 space-y-6"
          >
            <motion.div variants={slideUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-brand-500/30 text-xs font-bold text-brand-700 dark:text-brand-400">
              <Sparkles className="w-4 h-4 text-brand-500 animate-spin" />
              <span>Next-Gen AI Food Redistribution Platform</span>
            </motion.div>

            <motion.h1 variants={slideUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
              Turn Surplus Food into <br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-400 bg-clip-text text-transparent">
                Nourishment & Impact
              </span>
            </motion.h1>

            <motion.p variants={slideUp} className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl">
              Connecting commercial kitchens, corporate cafeterias, and event centers with verified NGOs and volunteer drivers in real-time. Driven by smart ML logistics.
            </motion.p>

            <motion.div variants={slideUp} className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/register">
                <motion.button
                  variants={buttonPress}
                  whileHover="hover"
                  whileTap="tap"
                  className="px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow transition-all flex items-center gap-2 group"
                >
                  <span>Start Rescuing Food</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link to="/how-it-works">
                <motion.button
                  variants={buttonPress}
                  whileHover="hover"
                  whileTap="tap"
                  className="px-7 py-4 text-sm font-bold text-gray-700 dark:text-gray-200 glass-card hover:border-brand-500/40 rounded-2xl transition-all"
                >
                  See How It Works
                </motion.button>
              </Link>
            </motion.div>

            {/* Quick Metrics */}
            <motion.div variants={slideUp} className="pt-6 border-t border-gray-200/50 dark:border-gray-800/50 grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">99.4%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Match Accuracy</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">&lt; 35m</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Rescue Time</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-600 dark:text-brand-400">Zero</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Waste Guarantee</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Visual Floating Cards */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 relative"
          >
            {/* Main Center Card */}
            <motion.div 
              animate={floatingAnimation}
              className="glass-card p-6 rounded-3xl shadow-2xl border border-brand-500/30 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Fresh Surplus Match</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Grand Hyatt Banquet • 120 Portions</p>
                  </div>
                </div>
                <span className="px-3 py-1 text-[10px] font-extrabold uppercase bg-brand-500 text-white rounded-full animate-pulse">
                  Live Dispatch
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-600 dark:text-gray-300">Route Efficiency</span>
                  <span className="text-brand-600 dark:text-brand-400">98% Optimized</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-600 to-emerald-400 h-full w-[98%]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-500" /> Prep: 20 mins ago</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-500" /> 1.8 miles away</span>
              </div>
            </motion.div>

            {/* Sub Floating Card 1 */}
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-8 -left-6 glass-card p-4 rounded-2xl border border-brand-500/20 shadow-xl max-w-xs hidden sm:flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">
                +450
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">Meals Delivered</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">City Shelter North • 5 mins ago</p>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-12 bg-brand-500/5 border-y border-brand-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial="initial"
                  whileHover="hover"
                  variants={cardHover}
                  className="p-6 rounded-2xl glass-card border border-brand-500/20 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{stat.label}</p>
                    <p className="text-[10px] text-brand-600 dark:text-brand-400 font-medium mt-0.5">{stat.change}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Engineered For Scale & Safety
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Advanced Intelligence Meeting Human Compassion
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Our platform solves regional logistics challenges to ensure surplus food is safely redirected before spoilage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={index}
                initial="initial"
                whileHover="hover"
                variants={cardHover}
                className="p-6 rounded-3xl glass-card border border-brand-500/20 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white flex items-center justify-center shadow-glow">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{feat.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{feat.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Step by Step How It Works */}
      <section className="py-20 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent border-t border-brand-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">Workflow</h2>
            <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">Seamless 4-Step Redistribution</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, idx) => (
              <div key={idx} className="relative p-6 rounded-3xl glass-card border border-brand-500/20 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-brand-600/30 dark:text-brand-400/30">{s.step}</span>
                    <span className="px-2.5 py-1 text-[9px] font-bold uppercase rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      {s.role}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white">{s.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">Community Voices</h2>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white">Trusted By Donors, NGOs & Volunteers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial="initial"
              whileHover="hover"
              variants={cardHover}
              className="p-6 rounded-3xl glass-card border border-brand-500/20 flex flex-col justify-between space-y-4"
            >
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 italic leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200/40 dark:border-gray-800/40">
                <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/30" />
                <div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-white">{t.name}</h5>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 text-white shadow-glow-lg overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl z-10">
            <h2 className="text-3xl sm:text-4xl font-black">Ready to Eliminate Food Waste in Your Community?</h2>
            <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
              Join thousands of restaurants, caterers, NGOs, and volunteers making a daily difference.
            </p>
          </div>
          <div className="z-10 flex flex-wrap gap-3">
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 text-xs font-bold text-brand-900 bg-white rounded-2xl shadow-xl hover:bg-brand-50 transition-all flex items-center gap-2"
              >
                <span>Register Your Organization</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
