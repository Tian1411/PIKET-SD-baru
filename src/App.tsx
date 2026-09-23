import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { ProfileModal } from './components/common/ProfileModal';
import { DetailLaporanModal } from './components/common/DetailLaporanModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';

// Guru components
import { GuruDashboard } from './components/guru/GuruDashboard';
import { FormLaporanPiket } from './components/guru/FormLaporanPiket';
import { RiwayatLaporan } from './components/guru/RiwayatLaporan';

// Admin components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RekapLaporan } from './components/admin/RekapLaporan';
import { MasterKelas } from './components/admin/MasterKelas';
import { MasterGuru } from './components/admin/MasterGuru';
import { MasterSiswa } from './components/admin/MasterSiswa';
import { PengaturanSekolah } from './components/admin/PengaturanSekolah';
import { AuditLogView } from './components/admin/AuditLogView';

const MainLayout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

  // Active View State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [editingReportId, setEditingReportId] = useState<string | undefined>(undefined);

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [activeReportIdModal, setActiveReportIdModal] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-700 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-700">
          Memuat Sistem Laporan Piket...
        </p>
        <p className="text-xs text-slate-400 mt-1">UPTD SD NEGERI OEHENDAK</p>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // Navigation handlers
  const handleOpenForm = (reportId?: string) => {
    setEditingReportId(reportId);
    setCurrentView('form');
  };

  const handleViewReport = (reportId: string) => {
    setActiveReportIdModal(reportId);
  };

  const handleEditReport = (rep: any) => {
    setEditingReportId(rep.id);
    setCurrentView('form');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col pb-24 md:pb-12">
      {/* Offline Status Warning */}
      <OfflineIndicator />

      {/* Global Header */}
      <Header
        activeTab={currentView}
        onSelectTab={(tab: string) => {
          if (tab === 'form') {
            setEditingReportId(undefined);
          }
          setCurrentView(tab);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={logout}
      />

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1">
        {user.role === 'admin' ? (
          // ADMIN VIEWS
          <>
            {currentView === 'dashboard' && (
              <AdminDashboard
                onViewReport={handleViewReport}
                onNavigateToRekap={() => setCurrentView('rekap')}
              />
            )}
            {currentView === 'rekap' && (
              <RekapLaporan onViewReport={handleViewReport} />
            )}
            {currentView === 'classes' && <MasterKelas />}
            {currentView === 'teachers' && <MasterGuru />}
            {currentView === 'students' && <MasterSiswa />}
            {currentView === 'settings' && <PengaturanSekolah />}
            {currentView === 'logs' && <AuditLogView />}
          </>
        ) : (
          // GURU VIEWS
          <>
            {currentView === 'dashboard' && (
              <GuruDashboard
                onNavigateToForm={handleOpenForm}
                onViewReport={handleViewReport}
              />
            )}
            {currentView === 'form' && (
              <FormLaporanPiket
                initialReportId={editingReportId}
                onSuccess={() => {
                  setCurrentView('dashboard');
                  setEditingReportId(undefined);
                }}
                onCancel={() => {
                  setCurrentView('dashboard');
                  setEditingReportId(undefined);
                }}
              />
            )}
            {currentView === 'riwayat' && (
              <RiwayatLaporan
                onViewReport={handleViewReport}
                onEditReport={handleEditReport}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={currentView}
        onSelectTab={(tab: string) => {
          if (tab === 'form') {
            setEditingReportId(undefined);
          }
          setCurrentView(tab);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Profile & Password Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Report Detail Modal */}
      {activeReportIdModal && (
        <DetailLaporanModal
          reportId={activeReportIdModal}
          isOpen={Boolean(activeReportIdModal)}
          isAdmin={user.role === 'admin'}
          onClose={() => setActiveReportIdModal(null)}
          onEdit={(rep) => {
            setActiveReportIdModal(null);
            handleEditReport(rep);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
