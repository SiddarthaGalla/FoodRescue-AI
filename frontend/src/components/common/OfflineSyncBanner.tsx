import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Zap, CloudOff } from 'lucide-react';
import { offlineSyncManager } from '../../lib/offlineSyncManager';
import { useToast } from '../../contexts/ToastContext';

export const OfflineSyncBanner: React.FC = () => {
  const { showToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(offlineSyncManager.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 Internet reconnected! Syncing offline queue...', 'success');
      handleSyncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚡ You are offline. Actions will queue and auto-sync when online.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineSyncManager.subscribe((count) => {
      setPendingCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    if (!navigator.onLine || isSyncing || pendingCount === 0) return;

    setIsSyncing(true);
    const { replayed, failed } = await offlineSyncManager.processQueue();
    setIsSyncing(false);

    if (replayed > 0) {
      showToast(`✅ Successfully synced ${replayed} offline action(s)!`, 'success');
    }
    if (failed > 0) {
      showToast(`⚠️ ${failed} action(s) failed to sync. Retrying on next connection.`, 'error');
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg text-xs font-extrabold flex items-center justify-between transition-all">
      <div className="flex items-center gap-2 max-w-2xl truncate">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse text-amber-200 shrink-0" />
            <span>⚡ You are currently offline (PWA Offline Mode)</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Online — Pending Auto-Sync Queue</span>
          </>
        )}

        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black tracking-wide border border-white/30">
            {pendingCount} queued action(s)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 border border-white/40 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
