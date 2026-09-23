import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  LogOut,
  Shield,
  GraduationCap,
  Clock,
  School,
  LayoutDashboard,
  FilePlus,
  History,
  FileSpreadsheet,
  Settings,
  Users,
  Building2,
  FileText,
} from 'lucide-react';

interface HeaderProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onOpenProfile: () => void;
  onLogout?: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  onSelectTab,
  onOpenProfile,
  onLogout,
}) => {
  const { user, teacher, assignedClass, settings, logout } = useAuth();
  const [currentTimeWITA, setCurrentTimeWITA] = useState<string>('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Makassar',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      setCurrentTimeWITA(now.toLocaleDateString('id-ID', options) + ' WITA');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      await onLogout();
    } else {
      await logout();
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        {/* Main Top Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* School Brand */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-center shadow-xs shrink-0 p-1 overflow-hidden">
                <img
                  src={settings?.logo_url || '/school-logo.png'}
                  alt={settings?.school_name || 'Logo Sekolah'}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.className = 'w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-md shrink-0';
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                  {settings?.school_name || 'UPTD SD NEGERI OEHENDAK'}
                </h1>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Sistem Laporan Piket Harian & Presensi Siswa • NPSN: {settings?.npsn || '50302819'}
                </p>
              </div>
            </div>

            {/* Middle: WITA Time Badge (Desktop) */}
            <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{currentTimeWITA}</span>
            </div>

            {/* Right: Controls & User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <PWAInstallButton />

              {/* User Role & Name Pill */}
              <button
                id="btn-header-profile"
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition"
                title="Buka Pengaturan Profil"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    isAdmin ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                >
                  {isAdmin ? <Shield className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px] md:max-w-[160px]">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    {isAdmin
                      ? 'Admin Sekolah'
                      : assignedClass
                      ? `Guru Kelas ${assignedClass.class_name}`
                      : 'Guru Piket'}
                  </p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                id="btn-header-logout"
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Keluar dari Aplikasi"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        {onSelectTab && (
          <div className="hidden sm:block border-t border-slate-100 bg-slate-50/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 py-1.5 overflow-x-auto">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => onSelectTab('dashboard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('rekap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'rekap'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Rekapitulasi & Ekspor</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('classes')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'classes'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Data Kelas</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('teachers')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'teachers'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Data Guru</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('students')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'students'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Data Siswa</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('settings')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'settings'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Identitas Sekolah</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('logs')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'logs'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Audit Log</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTab('dashboard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard Guru</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('form')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'form'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Isi Laporan Piket</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('riwayat')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      activeTab === 'riwayat'
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Riwayat Laporan</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">Konfirmasi Keluar</h3>
            <p className="mt-2 text-sm text-slate-600 text-center">
              Apakah Anda yakin ingin keluar dari sistem? Pastikan semua perubahan laporan piket telah disimpan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition"
              >
                Batal
              </button>
              <button
                id="btn-confirm-logout"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-sm font-semibold text-white shadow-md transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
