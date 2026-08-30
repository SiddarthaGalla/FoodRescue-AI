import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, X, CheckCircle2, ShieldCheck, KeyRound, Loader2, Camera, AlertCircle, Copy, Check } from 'lucide-react';
import { Donation } from '../../types/donation';
import { apiRequest } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface QRCodeModalProps {
  donation: Donation;
  mode: 'display' | 'scan';
  actionType: 'pickup' | 'delivery';
  onClose: () => void;
  onVerified?: (updated: Donation) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  donation,
  mode,
  actionType,
  onClose,
  onVerified,
}) => {
  const { showToast } = useToast();
  const [pinInput, setPinInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const pinCode = donation.verificationPin || '849201';
  const qrToken = donation.qrCodeToken || `FOODRESCUE_POD:${donation.id}:${pinCode}`;

  const handleCopyPin = () => {
    navigator.clipboard.writeText(pinCode);
    setCopied(true);
    showToast('6-digit PIN copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (providedCode?: string) => {
    const code = (providedCode || pinInput).trim();
    if (!code || verifying) return;

    setVerifying(true);
    try {
      const endpoint = actionType === 'pickup'
        ? `/donations/${donation.id}/verify-pickup`
        : `/donations/${donation.id}/verify-delivery`;

      const isPin = code.length === 6 && !isNaN(Number(code));
      const body = isPin ? { pin: code } : { qrCode: code };

      const updated = await apiRequest<Donation>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      showToast(
        actionType === 'pickup'
          ? 'Pickup verified successfully! Batch is now in transit.'
          : 'Proof of Delivery verified! Batch is marked delivered.',
        'success'
      );
      if (onVerified) onVerified(updated);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Verification failed. Check the QR code or PIN.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold shadow-md ${
              actionType === 'pickup' ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                {mode === 'display'
                  ? `${actionType === 'pickup' ? 'Pickup' : 'Proof of Delivery'} QR Code`
                  : `Verify ${actionType === 'pickup' ? 'Pickup' : 'Proof of Delivery'}`}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold truncate max-w-[200px]">
                Batch #{donation.id.slice(-6).toUpperCase()} • {donation.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl glass-card">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODE 1: DISPLAY QR & PIN */}
        {mode === 'display' && (
          <div className="space-y-4 text-center">
            {/* Visual SVG QR Code Renderer */}
            <div className="p-4 rounded-2xl bg-white border border-gray-200 dark:border-gray-700 shadow-inner flex flex-col items-center justify-center space-y-3 w-64 mx-auto">
              <svg
                className="w-48 h-48"
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="256" height="256" fill="#ffffff" />
                {/* Outer Markers */}
                <rect x="20" y="20" width="70" height="70" fill="#0f172a" rx="10" />
                <rect x="35" y="35" width="40" height="40" fill="#ffffff" rx="5" />
                <rect x="45" y="45" width="20" height="20" fill="#0f172a" rx="3" />

                <rect x="166" y="20" width="70" height="70" fill="#0f172a" rx="10" />
                <rect x="181" y="35" width="40" height="40" fill="#ffffff" rx="5" />
                <rect x="191" y="45" width="20" height="20" fill="#0f172a" rx="3" />

                <rect x="20" y="166" width="70" height="70" fill="#0f172a" rx="10" />
                <rect x="35" y="181" width="40" height="40" fill="#ffffff" rx="5" />
                <rect x="45" y="191" width="20" height="20" fill="#0f172a" rx="3" />

                {/* Data Grid Dots */}
                <rect x="110" y="30" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="135" y="45" width="16" height="16" fill="#10b981" rx="3" />
                <rect x="110" y="70" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="70" y="110" width="16" height="16" fill="#3b82f6" rx="3" />
                <rect x="100" y="110" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="130" y="110" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="160" y="110" width="16" height="16" fill="#10b981" rx="3" />
                <rect x="190" y="110" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="110" y="140" width="16" height="16" fill="#3b82f6" rx="3" />
                <rect x="140" y="140" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="110" y="170" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="140" y="170" width="16" height="16" fill="#10b981" rx="3" />
                <rect x="170" y="170" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="200" y="170" width="16" height="16" fill="#3b82f6" rx="3" />
                <rect x="110" y="200" width="16" height="16" fill="#0f172a" rx="3" />
                <rect x="150" y="200" width="16" height="16" fill="#0f172a" rx="3" />
              </svg>
              <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                {actionType === 'pickup' ? 'SCAN TO PICKUP' : 'PROOF OF DELIVERY'}
              </span>
            </div>

            {/* 6-Digit PIN Display Card */}
            <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Or Share 6-Digit Verification PIN</span>
              <div className="flex items-center justify-center gap-3 pt-0.5">
                <span className="text-2xl font-black font-mono tracking-widest text-brand-600 dark:text-brand-400">
                  {pinCode}
                </span>
                <button
                  onClick={handleCopyPin}
                  className="p-1.5 rounded-lg bg-brand-500/20 text-brand-600 hover:bg-brand-500/30 transition-all"
                  title="Copy PIN"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold text-xs shadow-md"
            >
              Done
            </button>
          </div>
        )}

        {/* MODE 2: SCAN QR OR ENTER 6-DIGIT PIN */}
        {mode === 'scan' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white mx-auto flex items-center justify-center shadow-glow">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Enter 6-Digit Verification PIN or Scan QR Code
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Ask the {actionType === 'pickup' ? 'donor' : 'driver'} for their 6-digit PIN code displayed on their phone screen.
                </p>
              </div>

              <div className="flex justify-center pt-1">
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 849201"
                  className="w-48 text-center text-xl font-black font-mono tracking-widest px-3 py-2.5 rounded-xl glass-input border-2 border-blue-500 focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={verifying || pinInput.length !== 6}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{verifying ? 'Verifying PIN...' : `Verify & Complete ${actionType === 'pickup' ? 'Pickup' : 'Proof of Delivery'}`}</span>
              </button>
            </div>

            {/* Simulated One-Tap Instant QR Code Scanner Simulator Button */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-center space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Or Scan Camera QR Code</span>
              <button
                type="button"
                onClick={() => handleVerify(qrToken)}
                disabled={verifying}
                className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/30 flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Simulate Instant Camera QR Scan</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
