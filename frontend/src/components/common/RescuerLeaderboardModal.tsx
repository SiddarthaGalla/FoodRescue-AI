import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Medal, Code, Copy, Check, Star, Building2, UserCheck, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface RescuerLeaderboardModalProps {
  onClose: () => void;
}

const MOCK_TOP_DONORS = [
  { rank: 1, name: 'Taj Culinary & Buffet', meals: 1420, co2: '3,124 kg', badge: '🥇 Diamond Rescuer' },
  { rank: 2, name: 'Green Harvest Bistro', meals: 980, co2: '2,156 kg', badge: '🥈 Platinum Donor' },
  { rank: 3, name: 'Grand Hyatt Catering', meals: 750, co2: '1,650 kg', badge: '🥉 Gold Donor' },
  { rank: 4, name: 'Connaught Bakery & Cafe', meals: 540, co2: '1,188 kg', badge: '⭐ Silver Partner' },
  { rank: 5, name: 'Delhi City Supermarket', meals: 420, co2: '924 kg', badge: '⭐ Certified Partner' },
];

const MOCK_TOP_VOLUNTEERS = [
  { rank: 1, name: 'Ramesh Kumar (EV Driver)', deliveries: 184, km: '840 km', rating: 4.9 },
  { rank: 2, name: 'Priya Sharma (E-Bike)', deliveries: 142, km: '620 km', rating: 4.95 },
  { rank: 3, name: 'Amitabh Singh (Thermal Bag)', deliveries: 118, km: '510 km', rating: 4.88 },
];

export const RescuerLeaderboardModal: React.FC<RescuerLeaderboardModalProps> = ({ onClose }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badge'>('leaderboard');
  const [copied, setCopied] = useState(false);
  const [restaurantName, setRestaurantName] = useState('Green Harvest Bistro');

  const embedCode = `<div className="foodrescue-badge" style="background:#059669;color:#fff;padding:16px;border-radius:16px;font-family:sans-serif;display:inline-flex;align-items:center;gap:12px;box-shadow:0 10px 25px rgba(5,150,105,0.3);">
  <img src="https://foodrescue.app/vite.svg" width="32" height="32" alt="FoodRescue AI" />
  <div>
    <div style="font-weight:900;font-size:14px;">${restaurantName}</div>
    <div style="font-size:11px;opacity:0.9;">🌱 Zero Food Waste Certified Donor 2026 • FoodRescue AI</div>
  </div>
</div>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    showToast('📋 HTML Embed Code copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl p-5 sm:p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-4 text-gray-900 dark:text-white bg-white/95 dark:bg-gray-900/95 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black">Rescuer Leaderboard & Website Badges</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs font-black">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Top Rescuers</span>
          </button>
          <button
            onClick={() => setActiveTab('badge')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'badge'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Embed Web Badge</span>
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <div className="space-y-4">
            {/* Top Donors List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Top Food Donor Partners</span>
              </h4>
              <div className="space-y-1.5">
                {MOCK_TOP_DONORS.map((d) => (
                  <div
                    key={d.rank}
                    className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full font-black text-[11px] flex items-center justify-center ${
                          d.rank === 1
                            ? 'bg-amber-400 text-black'
                            : d.rank === 2
                            ? 'bg-gray-300 text-black'
                            : d.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-600'
                        }`}
                      >
                        {d.rank}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{d.name}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{d.badge}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 dark:text-white">{d.meals} Meals</p>
                      <p className="text-[10px] text-gray-400">{d.co2} CO₂ saved</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Volunteers */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                <span>Top Delivery Drivers</span>
              </h4>
              <div className="space-y-1.5">
                {MOCK_TOP_VOLUNTEERS.map((v) => (
                  <div
                    key={v.rank}
                    className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/5 border border-purple-500/15 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 font-black text-[11px] flex items-center justify-center">
                        #{v.rank}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{v.name}</p>
                        <p className="text-[10px] text-gray-400">{v.km} driven • ⭐ {v.rating}</p>
                      </div>
                    </div>
                    <span className="font-black text-purple-600 dark:text-purple-400">{v.deliveries} Rescues</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Embed Web Badge Generator Tab */
          <div className="space-y-4 text-xs font-bold">
            <p className="text-gray-500 dark:text-gray-400">
              Embed a live, verified **"Zero Food Waste Certified Donor"** badge on your restaurant's website or marketing pages!
            </p>

            <div>
              <label className="block mb-1">Your Restaurant / Business Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-bold"
              />
            </div>

            {/* Live Badge Preview Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-400">Live Website Badge Preview:</label>
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm">{restaurantName}</p>
                  <p className="text-[11px] text-emerald-100 font-bold">
                    🌱 Zero Food Waste Certified Donor 2026 • FoodRescue AI
                  </p>
                </div>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-400">HTML Embed Snippet Code:</label>
              <div className="relative">
                <textarea
                  readOnly
                  rows={4}
                  value={embedCode}
                  className="w-full p-3 rounded-xl bg-gray-900 text-emerald-400 font-mono text-[11px] resize-none border border-gray-700"
                />
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center gap-1 shadow-md transition-all"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
