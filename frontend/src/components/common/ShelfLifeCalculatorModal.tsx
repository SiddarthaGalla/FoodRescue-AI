import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Thermometer, ShieldAlert, CheckCircle2, X, RefreshCw, AlertTriangle } from 'lucide-react';

interface ShelfLifeCalculatorModalProps {
  onClose: () => void;
}

const FOOD_CATEGORIES = [
  { id: 'cooked_gravy', name: 'Cooked Rice & Gravy', baseHours: 4, hotRequired: true },
  { id: 'dairy_paneer', name: 'Dairy & Paneer Dishes', baseHours: 3, hotRequired: true },
  { id: 'bakery_bread', name: 'Fresh Bakery & Bread', baseHours: 24, hotRequired: false },
  { id: 'fruits_salad', name: 'Cut Fruits & Salads', baseHours: 4, hotRequired: false },
  { id: 'cooked_meat', name: 'Cooked Meat & Seafood', baseHours: 3, hotRequired: true },
];

export const ShelfLifeCalculatorModal: React.FC<ShelfLifeCalculatorModalProps> = ({ onClose }) => {
  const [category, setCategory] = useState('cooked_gravy');
  const [temp, setTemp] = useState<number>(30); // Ambient room temp default

  const selectedCat = FOOD_CATEGORIES.find((c) => c.id === category) || FOOD_CATEGORIES[0];

  // Calculate safe window based on temperature
  let safeHours = selectedCat.baseHours;
  let statusColor = 'text-emerald-500';
  let advice = '';

  if (temp >= 60) {
    safeHours = Math.round(selectedCat.baseHours * 2.5);
    advice = '♨️ Safe Hot Holding (>60°C): Keep covered above 60°C until delivery.';
    statusColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (temp <= 5) {
    safeHours = Math.round(selectedCat.baseHours * 4.0);
    advice = '❄️ Safe Refrigeration (≤4°C): Maintain cold chain during transit.';
    statusColor = 'text-blue-600 dark:text-blue-400';
  } else if (temp > 32) {
    safeHours = Math.max(1, Math.round(selectedCat.baseHours * 0.5));
    advice = '⚠️ High Ambient Heat (>32°C): Food spoils rapidly. Transport within 1-2 hours!';
    statusColor = 'text-red-500';
  } else {
    safeHours = Math.max(1, Math.round(selectedCat.baseHours * 0.8));
    advice = '🌡️ Room Temperature Storage (20-30°C): Distribute quickly to shelter recipients.';
    statusColor = 'text-amber-500';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-5 sm:p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-4 text-gray-900 dark:text-white bg-white/95 dark:bg-gray-900/95"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-black">AI Food Expiration Predictor</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select food category and storage temperature to calculate safe consumption windows and reheating rules.
        </p>

        <div className="space-y-3 text-xs font-bold">
          <div>
            <label className="block mb-1">Food Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-bold"
            >
              {FOOD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span>Ambient Storage Temp (°C)</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{temp}°C</span>
            </div>
            <input
              type="range"
              min="0"
              max="75"
              step="1"
              value={temp}
              onChange={(e) => setTemp(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0°C (Refrigerated)</span>
              <span>30°C (Room)</span>
              <span>75°C (Hot Holding)</span>
            </div>
          </div>

          {/* AI Calculation Result Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Safe Consumption Cutoff
              </span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${statusColor}`}>{safeHours} Hours</span>
              <span className="text-xs text-gray-500">Max Safe Storage</span>
            </div>

            <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold leading-relaxed pt-1 border-t border-emerald-500/15">
              {advice}
            </p>

            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-gray-800/80 text-[10px] text-gray-600 dark:text-gray-300 font-medium">
              💡 <b>HACCP Reheating Rule:</b> Reheat cooked meals thoroughly to an internal temperature of at least 74°C before serving to shelter residents.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
