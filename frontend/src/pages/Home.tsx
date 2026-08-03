import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, ArrowRight, ShieldCheck, Truck, 
  Building2, Users, TrendingUp, Star, MapPin, Clock, Cpu, Leaf, ChevronRight
} from 'lucide-react';
import { slideUp, staggerContainer, cardHover, buttonPress, floatingAnimation } from '../animations/variants';

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
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
    },
    {
      icon: Truck,
      title: 'Dynamic Route Dispatch',
      description: 'Generates optimal, low-emission pickup routes for volunteers to guarantee hot meal delivery in under 45 minutes.',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=80',
    },
    {
      icon: ShieldCheck,
      title: 'Food Quality Verification',
      description: 'Integrated digital temperature checks and safety protocol validation before any food batch dispatch.',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
    },
    {
      icon: TrendingUp,
      title: 'Real-time Impact Analytics',
      description: 'Comprehensive ESG dashboards for enterprise donors showing carbon offset, tax deductions, and meals donated.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Post Surplus Food',
      desc: 'Restaurants, hotels, or events log excess items via our 30-second AI quick-scan portal.',
      role: 'Donors',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80',
    },
    {
      step: '02',
      title: 'AI Priority Dispatch',
      desc: 'Algorithm matches item shelf-life with nearby shelter demand and routes nearest volunteer.',
      role: 'System',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
    },
    {
      step: '03',
      title: 'Rapid Transport',
      desc: 'Volunteers pick up insulated containers with live GPS routing and QR verification.',
      role: 'Volunteers',
      image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&auto=format&fit=crop&q=80',
    },
    {
      step: '04',
      title: 'Dignified Distribution',
      desc: 'Shelters receive fresh meals, auto-updating donor tax credits and ESG reports.',
      role: 'NGOs',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&auto=format&fit=crop&q=80',
    },
  ];

  const testimonials = [
    {
      name: 'Executive Culinary Partner',
      role: 'Horizon Hotel & Resort Alliance',
      image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
      text: 'FoodRescue AI transformed how our 5-star hotel manages surplus banquet meals. We rescued 14,000 hot meals last quarter effortlessly.',
    },
    {
      name: 'Program Director',
      role: 'Hope Community Haven NGO Network',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      text: 'The AI notification system alerts us 2 hours before food arrives. It has increased our meal distribution efficiency by over 300%.',
    },
    {
      name: 'Community Route Captain',
      role: 'Regional Volunteer Logistics Fleet',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      text: 'The route optimization app makes food rescue seamless during my evening commute. Every delivery feels directly impactful.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden transition-colors duration-300">
      
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 lg:pt-16 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Text */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="lg:col-span-7 space-y-5 sm:space-y-6 text-left"
          >
            <motion.div variants={slideUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-card border border-brand-500/30 text-[11px] sm:text-xs font-black text-brand-700 dark:text-brand-400">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 animate-spin" />
              <span>Next-Gen AI Food Redistribution Platform</span>
            </motion.div>

            <motion.h1 variants={slideUp} className="text-2xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-gray-900 dark:text-white break-words">
              Turn Surplus Food into <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-500 dark:from-brand-400 dark:via-emerald-400 dark:to-green-300 bg-clip-text text-transparent">
                Nourishment & Impact
              </span>
            </motion.h1>

            <motion.p variants={slideUp} className="text-xs sm:text-base lg:text-lg text-gray-800 dark:text-gray-100 leading-relaxed max-w-2xl font-semibold">
              Connecting commercial kitchens, corporate cafeterias, and event centers with verified NGOs and volunteer drivers in real-time. Driven by smart ML logistics.
            </motion.p>

            {/* Responsive Action Buttons (Stacked Full Width on Phone, Inline on PC) */}
            <motion.div variants={slideUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full sm:w-auto">
              <Link to="/register" className="w-full sm:w-auto">
                <motion.button
                  variants={buttonPress}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Rescuing Food</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link to="/how-it-works" className="w-full sm:w-auto">
                <motion.button
                  variants={buttonPress}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-gray-900 dark:text-white glass-card hover:border-brand-500/40 rounded-2xl transition-all border border-gray-300 dark:border-gray-700 flex items-center justify-center"
                >
                  See How It Works
                </motion.button>
              </Link>
            </motion.div>

            {/* Quick Metrics */}
            <motion.div variants={slideUp} className="pt-5 border-t border-gray-200 dark:border-gray-800/80 grid grid-cols-3 gap-2 sm:gap-6 text-center sm:text-left">
              <div>
                <p className="text-lg sm:text-2xl font-black text-brand-700 dark:text-brand-400">99.4%</p>
                <p className="text-[10px] sm:text-xs font-black text-gray-800 dark:text-gray-200">Match Accuracy</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-brand-700 dark:text-brand-400">&lt; 35m</p>
                <p className="text-[10px] sm:text-xs font-black text-gray-800 dark:text-gray-200">Avg Rescue Time</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-black text-brand-700 dark:text-brand-400">Zero</p>
                <p className="text-[10px] sm:text-xs font-black text-gray-800 dark:text-gray-200">Waste Guarantee</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Visual Photo Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 relative mt-4 lg:mt-0"
          >
            <motion.div 
              animate={floatingAnimation}
              className="glass-card p-4 sm:p-5 rounded-3xl shadow-2xl border border-brand-500/30 space-y-3 sm:space-y-4 overflow-hidden"
            >
              <div className="relative h-44 sm:h-56 rounded-2xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=700&auto=format&fit=crop&q=80" 
                  alt="Food Rescue Distribution" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-3.5 sm:p-4">
                  <div className="text-white">
                    <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md bg-brand-500 text-white">
                      Live Surplus Match
                    </span>
                    <h4 className="text-xs sm:text-sm font-black mt-1 text-white">Fresh Catering Surplus • 140 Portions</h4>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-brand-500/10 dark:bg-brand-950/50 border border-brand-500/30 space-y-2">
                <div className="flex justify-between text-xs font-black text-gray-900 dark:text-white">
                  <span>Logistics Route Optimization</span>
                  <span className="text-brand-700 dark:text-brand-400">98% Efficient</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-brand-600 to-emerald-400 h-full w-[98%]" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black text-gray-800 dark:text-gray-200">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> Prep: 20m ago</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" /> 1.8 mi away</span>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* Stats Counter Section (Neat 2-Column Grid on Mobile Phone, 4-Column on PC) */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                whileHover="hover"
                variants={cardHover}
                className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow flex-shrink-0">
                  <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                  <p className="text-[11px] sm:text-xs font-black text-gray-800 dark:text-gray-100">{stat.label}</p>
                  <p className="text-[9px] sm:text-[10px] text-brand-700 dark:text-brand-400 font-black mt-0.5">{stat.change}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Features Grid with Visual Photos */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-2 sm:space-y-4 mb-8 sm:mb-16">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-700 dark:text-brand-400">
            Engineered For Scale & Safety
          </h2>
          <p className="text-xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Advanced Intelligence Meeting Human Compassion
          </p>
          <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
            Our platform solves regional logistics challenges to ensure surplus food is safely redirected before spoilage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={index}
                whileHover="hover"
                variants={cardHover}
                className="rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 overflow-hidden flex flex-col justify-between"
              >
                <div className="h-32 sm:h-36 overflow-hidden relative">
                  <img src={feat.image} alt={feat.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-3 left-3 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md">
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
                <div className="p-4 sm:p-5 space-y-1.5">
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">{feat.title}</h3>
                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-bold">{feat.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Step by Step How It Works with Photos */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16 space-y-1.5 sm:space-y-3">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-700 dark:text-brand-400">Workflow</h2>
          <h3 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">Seamless 4-Step Redistribution</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((s, idx) => (
            <div key={idx} className="rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 overflow-hidden space-y-2.5 p-3.5 sm:p-4">
              <div className="h-28 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden relative">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-md bg-brand-600 text-white">
                  {s.role}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs font-black text-brand-700 dark:text-brand-400">STEP {s.step}</span>
                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">{s.title}</h4>
                <p className="text-[11px] sm:text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-bold">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16 space-y-1.5 sm:space-y-3">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-brand-700 dark:text-brand-400">Community Voices</h2>
          <h3 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white">Trusted By Donors, NGOs & Volunteers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              whileHover="hover"
              variants={cardHover}
              className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 flex flex-col justify-between space-y-3 sm:space-y-4"
            >
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-gray-800 dark:text-gray-100 italic leading-relaxed font-bold">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
                <img src={t.image} alt={t.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-brand-500/30 flex-shrink-0" />
                <div>
                  <h5 className="text-xs font-black text-gray-900 dark:text-white">{t.name}</h5>
                  <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative p-6 sm:p-14 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-emerald-600 text-white shadow-glow-lg overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-xl z-10 text-center md:text-left">
            <h2 className="text-xl sm:text-4xl font-black text-white">Ready to Eliminate Food Waste in Your Community?</h2>
            <p className="text-xs sm:text-sm text-brand-100 leading-relaxed font-bold">
              Join thousands of restaurants, caterers, NGOs, and volunteers making a daily difference.
            </p>
          </div>
          <div className="z-10 w-full md:w-auto flex justify-center">
            <Link to="/register" className="w-full md:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full md:w-auto px-7 py-3.5 text-xs font-black text-brand-900 bg-white rounded-2xl shadow-xl hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
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
