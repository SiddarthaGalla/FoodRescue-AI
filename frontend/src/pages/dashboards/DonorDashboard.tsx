import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Truck, 
  Leaf, Award
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { cardHover } from '../../animations/variants';

export const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const stats = [
    { title: 'Total Donated Portions', value: '12,450', change: '+850 this month', icon: Package },
    { title: 'Active Pickups Today', value: '3 Batches', change: 'En route now', icon: Truck },
    { title: 'CO₂ Emissions Saved', value: '4.8 Tons', change: 'ESG Certified', icon: Leaf },
    { title: 'Tax Deductible Value', value: '$24,900', change: 'Auto-receipted', icon: Award },
  ];

  const activeDonations = [
    { id: 'DON-9481', item: 'Gourmet Banquet Catering Surplus', qty: '140 Portions', status: 'Matched & Dispatched', eta: '18 mins', driver: 'Driver Fleet #402' },
    { id: 'DON-9480', item: 'Fresh Artisan Bakery Pastries', qty: '80 Portions', status: 'Picked Up', eta: 'Delivered', driver: 'Driver Fleet #118' },
    { id: 'DON-9479', item: 'Organic Salad Bar Surplus', qty: '65 Portions', status: 'Completed', eta: 'Receipt Generated', driver: 'Driver Fleet #255' },
  ];

  const handleCreateDonation = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('New food surplus listing posted to AI matching engine!', 'success');
    setShowModal(false);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="donor" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 overflow-y-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-md bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
              Donor Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
              Welcome back, {user?.name || 'Partner Kitchen'}
            </h1>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Manage your food surplus posts, track live volunteer pickups, and download tax reports.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Post Food Surplus</span>
          </motion.button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-brand-700 dark:text-brand-400">{s.change}</span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.title}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Active Rescue Listings */}
        <div className="p-4 sm:p-6 rounded-3xl glass-card border border-brand-500/20 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Active Food Rescue Batches</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Surplus Item</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Assigned Logistics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {activeDonations.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-500/5 transition-colors">
                    <td className="py-4 font-mono font-bold text-brand-700 dark:text-brand-400">{item.id}</td>
                    <td className="py-4 font-bold text-gray-900 dark:text-white">{item.item}</td>
                    <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">{item.qty}</td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-gray-700 dark:text-gray-300">{item.driver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Post Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Post New Food Surplus Batch</h3>
            <form onSubmit={handleCreateDonation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Food Item Name / Description</label>
                <input type="text" required placeholder="e.g., Prepared Hot Meals (Pasta & Salad)" className="w-full px-3 py-2.5 rounded-xl glass-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Quantity (Portions)</label>
                  <input type="number" required placeholder="120" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Expiry Window (Hours)</label>
                  <input type="number" required placeholder="4" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl glass-card font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow">Post Listing</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
