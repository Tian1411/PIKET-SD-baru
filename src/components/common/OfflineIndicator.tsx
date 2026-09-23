import React from 'react';
import { useOnlineStatus } from '../../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode Offline — Anda sedang tidak terhubung internet. Data tersimpan lokal.</span>
    </div>
  );
};
