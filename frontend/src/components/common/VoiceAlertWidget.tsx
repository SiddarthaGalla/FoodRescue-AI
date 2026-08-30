import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, Play, Settings2, Sparkles, Check } from 'lucide-react';
import { soundManager } from '../../lib/soundAlert';
import { useToast } from '../../contexts/ToastContext';

interface VoiceAlertWidgetProps {
  role?: 'donor' | 'ngo' | 'volunteer' | 'admin';
}

export const VoiceAlertWidget: React.FC<VoiceAlertWidgetProps> = ({ role = 'ngo' }) => {
  const { showToast } = useToast();
  const [enabled, setEnabled] = useState(soundManager.getVoiceEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [isOpen, setIsOpen] = useState(false);

  const toggleVoice = () => {
    const next = !enabled;
    setEnabled(next);
    soundManager.setVoiceEnabled(next);
    showToast(next ? '🔊 Voice & Audio Alerts Enabled' : '🔇 Audio Alerts Muted', 'info');
    if (next) {
      soundManager.playSuccessChime();
      soundManager.speak(`Voice alert system active for ${role} dashboard.`);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    soundManager.setVolume(v);
  };

  const handleTestChime = () => {
    soundManager.playUrgentChime();
    setTimeout(() => {
      soundManager.speak(`Urgent alert test: 50 meals expiring soon nearby!`);
    }, 400);
  };

  return (
    <div className="fixed bottom-24 right-5 z-40">
      {/* Floating Toggle Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-300 flex items-center gap-2 ${
            enabled
              ? 'bg-emerald-600/90 text-white border-emerald-400/40 shadow-emerald-600/30 hover:scale-105'
              : 'bg-gray-800/90 text-gray-400 border-gray-700 hover:scale-105'
          }`}
          title="Voice Alert & Sound Controls"
        >
          {enabled ? <Volume2 className="w-5 h-5 animate-pulse text-emerald-200" /> : <VolumeX className="w-5 h-5" />}
          <span className="text-xs font-black hidden sm:inline">
            {enabled ? 'Voice Alerts ON' : 'Muted'}
          </span>
        </button>

        {/* Popover Controls Menu */}
        {isOpen && (
          <div className="absolute bottom-14 right-0 w-72 p-4 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-3.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl text-gray-900 dark:text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black">Audio & Voice Alert System</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
              Plays audio chimes and voice announcements for urgent food expirations and route dispatches.
            </p>

            {/* Toggle Enable Switch */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/80">
              <span className="text-xs font-bold">Voice Announcements</span>
              <button
                type="button"
                onClick={toggleVoice}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  enabled ? 'bg-emerald-600' : 'bg-gray-400 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-gray-600 dark:text-gray-300">
                <span>Alert Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            {/* Test Audio Button */}
            <button
              type="button"
              onClick={handleTestChime}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Test Audio Chime & Speech</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
