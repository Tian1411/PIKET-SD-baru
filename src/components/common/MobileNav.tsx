import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  History,
  User,
  Building2,
  FileSpreadsheet,
  Settings,
  Users,
} from 'lucide-react';

interface MobileNavProps {
  activeTab?: string;
  currentTab?: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  currentTab,
  onSelectTab,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const tab = activeTab || currentTab || 'dashboard';

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {isAdmin ? (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                tab === 'dashboard'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] leading-none">Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('rekap')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                tab === 'rekap'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span className="text-[10px] leading-none">Rekap</span>
            </button>

            <button
              onClick={() => onSelectTab('classes')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                tab === 'classes'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-[10px] leading-none">Kelas</span>
            </button>

            <button
              onClick={() => onSelectTab('students')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                tab === 'students'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] leading-none">Siswa</span>
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition ${
                tab === 'settings'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] leading-none">Sekolah</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                tab === 'dashboard'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[10px] leading-none">Beranda</span>
            </button>

            <button
              onClick={() => onSelectTab('form')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                tab === 'form'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="w-8 h-8 -mt-3 rounded-full bg-blue-700 text-white flex items-center justify-center shadow-md">
                <FilePlus className="w-4 h-4" />
              </div>
              <span className="text-[10px] leading-none">Isi Piket</span>
            </button>

            <button
              onClick={() => onSelectTab('riwayat')}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                tab === 'riwayat'
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] leading-none">Riwayat</span>
            </button>

            {onOpenProfile && (
              <button
                onClick={onOpenProfile}
                className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-500 hover:text-slate-800 transition"
              >
                <User className="w-5 h-5" />
                <span className="text-[10px] leading-none">Profil</span>
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
};
