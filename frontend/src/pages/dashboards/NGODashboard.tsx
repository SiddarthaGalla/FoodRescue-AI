import React from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Package, MapPin, CheckCircle, Clock, 
  HandHeart, ArrowUpRight, Users, Bell 
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cardHover } from '../../animations/variants';

export const NGODashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const stats = [
    { title: 'Meals Received This Month', value: '8,920', change: '+14% vs last month', icon: Building2 },
    { title: 'Active Deliveries Inbound', value: '2 Batches', change: 'ETA < 25 mins', icon: Package },
    { title: 'Shelter Capacity Filled', value: '92%', change: 'Optimal distribution', icon: Users },
    { title: 'Verified Quality Index', value: '99.8%', change: 'Temperature verified', icon: CheckCircle },
  ];

  const availableFeed = [
    { id: 'FEED-102', donor: 'Ritz Carlton Banquet', item: 'Cooked Chicken Breasts & Rice', qty: '180 Portions', distance: '1.4 miles', temp: 'Compliant' },
    { id: 'FEED-103', donor: 'Whole Foods Market', item: 'Fresh Organic Produce Assortment', qty: '90 Portions', distance: '2.1 miles', temp: 'Compliant' },
  ];

  const handleClaim = (id: string) => {
    showToast(`Claim request for ${id} submitted. Dispatching nearest volunteer!`, 'success');
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="ngo" />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Shelter NGO Command Center
            </span>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
              {user?.name || 'St. Mary Community Shelter'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Claim incoming surplus food batches, coordinate volunteer drops, and track nutrition balance.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400">{s.change}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.title}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Live Available Food Feed */}
        <div className="p-6 rounded-3xl glass-card border border-brand-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">AI Available Surplus Food Feed</h3>
            <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-brand-500 text-white animate-pulse">
              Live Feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableFeed.map((f) => (
              <div key={f.id} className="p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{f.item}</h4>
                    <p className="text-xs text-gray-500">{f.donor}</p>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold text-brand-600 dark:text-brand-400 bg-brand-500/10 rounded-md">
                    {f.distance}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                  <span>Quantity: <strong className="text-gray-900 dark:text-white">{f.qty}</strong></span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">{f.temp}</span>
                </div>
                <button
                  onClick={() => handleClaim(f.id)}
                  className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-500 rounded-xl shadow-glow"
                >
                  Claim Food Batch
                </button>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};
