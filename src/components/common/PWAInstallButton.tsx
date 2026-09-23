import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="btn-install-pwa"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95"
        title="Pasang Aplikasi di HP / Desktop"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Pasang Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="btn-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-2.5 py-1.5 text-xs font-medium transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Pasang di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Pasang di iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                1. Buka halaman ini di browser <strong>Safari</strong>.<br />
                2. Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak panah ke atas di bagian bawah).<br />
                3. Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.<br />
                4. Ketuk <strong>Tambah</strong> di sudut kanan atas.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 shadow-md"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
