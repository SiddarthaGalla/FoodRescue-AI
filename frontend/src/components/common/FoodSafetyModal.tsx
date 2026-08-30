import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, ShieldCheck, ShieldAlert, X, Check, Loader2, Info } from 'lucide-react';
import { Donation } from '../../types/donation';
import { apiRequest } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface FoodSafetyModalProps {
  donation: Donation;
  onClose: () => void;
  onLogged: () => void;
}

export const FoodSafetyModal: React.FC<FoodSafetyModalProps> = ({ donation, onClose, onLogged }) => {
  const { showToast } = useToast();
  const [temp, setTemp] = useState<string>('65');
  const [seal, setSeal] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const numTemp = parseFloat(temp) || 0;
  const isColdSafe = numTemp <= 8.0;
  const isHotSafe = numTemp >= 55.0;
  const isHaccpSafe = (isColdSafe || isHotSafe) && seal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest(`/donations/${donation.id}/safety-log`, {
        method: 'POST',
        body: JSON.stringify({
          temperatureCelsius: numTemp,
          containerSealVerified: seal,
          notes,
        }),
      });

      showToast(
        isHaccpSafe
          ? '🛡️ HACCP Food Safety Pass Certified!'
          : '⚠️ Temperature logged (Caution: Outside standard HACCP ideal range)',
        isHaccpSafe ? 'success' : 'info'
      );
      onLogged();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to log safety inspection', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-4 text-gray-900 dark:text-white bg-white/95 dark:bg-gray-900/95"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-black">HACCP Food Safety Inspection</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Verify food storage temperature and container seal integrity before pickup/delivery.
        </p>

        {/* HACCP Status Banner */}
        <div
          className={`p-3 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
            isHaccpSafe
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
          }`}
        >
          {isHaccpSafe ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div>
            <p>{isHaccpSafe ? '🛡️ HACCP Health Standard Passed' : '⚠️ Warning: Ideal HACCP range is < 8°C (Cold) or > 55°C (Hot)'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
          <div>
            <label className="block mb-1">Measured Temperature (°C) *</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                required
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input pr-12 text-sm font-black"
                placeholder="e.g. 65"
              />
              <span className="absolute right-3 top-2.5 text-gray-400 font-bold">°C</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Chilled Safe: ≤ 8°C</span>
              <span>Hot Safe: ≥ 55°C</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
            <span className="text-xs">Container Seal & Packaging Verified?</span>
            <button
              type="button"
              onClick={() => setSeal(!seal)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                seal ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  seal ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block mb-1">Inspector Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Insulated thermal carrier bag used"
              className="w-full px-3 py-2.5 rounded-xl glass-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Log Inspection & Certify HACCP Pass</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
