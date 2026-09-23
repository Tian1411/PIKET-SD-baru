import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DashboardAdminStats } from '../../types';
import {
  School,
  Users,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Lock,
  Unlock,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  onViewReport: (reportId: string) => void;
  onNavigateToRekap: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onViewReport,
  onNavigateToRekap,
}) => {
  const [stats, setStats] = useState<DashboardAdminStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (dateStr: string, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await api.getAdminDashboard(dateStr);
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleToggleLock = async (reportId: string, currentStatus?: string) => {
    try {
      if (currentStatus === 'locked') {
        await api.reopenReport(reportId);
      } else {
        await api.lockReport(reportId);
      }
      loadData(selectedDate, true);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kunci laporan.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dashboard Monitoring Admin
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-0.5">
            Monitoring Piket Harian Sekolah
          </h2>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={() => loadData(selectedDate, true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Memuat data dashboard...</p>
        </div>
      ) : stats ? (
        <>
          {/* Main Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Kelas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Kelas
                </span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_classes}</p>
                <span className="text-[11px] text-blue-600 font-medium">Kelas 1 s/d 6 Aktif</span>
              </div>
            </div>

            {/* Card 2: Total Siswa */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Siswa
                </span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.total_students}</p>
                <span className="text-[11px] text-emerald-600 font-medium">Terdaftar Aktif</span>
              </div>
            </div>

            {/* Card 3: Guru Aktif */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Guru Wali / Piket
                </span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{stats.active_teachers}</p>
                <span className="text-[11px] text-purple-600 font-medium">Pengajar SD</span>
              </div>
            </div>

            {/* Card 4: Laporan Masuk */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Laporan Masuk
                </span>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {stats.reports_today} / {stats.total_classes}
                </p>
                <span className="text-[11px] text-amber-700 font-medium">
                  {stats.today_not_filled_classes === 0
                    ? '✓ Semua kelas terisi'
                    : `${stats.today_not_filled_classes} kelas belum lapor`}
                </span>
              </div>
            </div>
          </div>

          {/* Today's Presensi Summary Bar */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Ringkasan Presensi Siswa Tanggal: {selectedDate}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-bold text-emerald-700 block">Siswa Hadir (H)</span>
                <span className="text-2xl font-black text-emerald-900">{stats.today_present}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-bold text-amber-700 block">Siswa Sakit (S)</span>
                <span className="text-2xl font-black text-amber-900">{stats.today_sick}</span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                <span className="text-xs font-bold text-sky-700 block">Siswa Izin (I)</span>
                <span className="text-2xl font-black text-sky-900">{stats.today_permit}</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-bold text-rose-700 block">Siswa Alpa (A)</span>
                <span className="text-2xl font-black text-rose-900">{stats.today_absent}</span>
              </div>
            </div>
          </div>

          {/* TABLE: STATUS LAPORAN PIKET HARI INI */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Status Laporan Piket Seluruh Kelas
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau kelas yang sudah mengirim laporan, belum lengkap, atau belum diisi.
                </p>
              </div>

              <button
                onClick={onNavigateToRekap}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition self-start sm:self-auto"
              >
                Buka Rekapitulasi Lengkap →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Guru Piket/Wali Kelas</th>
                    <th className="py-3 px-3 text-center">Jml Siswa</th>
                    <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                    <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                    <th className="py-3 px-3 text-center text-sky-700">Izin</th>
                    <th className="py-3 px-3 text-center text-rose-700">Alpa</th>
                    <th className="py-3 px-3 text-center">Status Laporan</th>
                    <th className="py-3 px-3 text-center">Waktu Kirim</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.today_status_list.map((row, idx) => (
                    <tr key={row.class_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">
                        Kelas {row.class_name}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{row.teacher_name}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-600">
                        {row.total_students}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-emerald-700">
                        {row.present}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-amber-700">
                        {row.sick}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-sky-700">
                        {row.permit}
                      </td>
                      <td className="py-3 px-3 text-center font-extrabold text-rose-700">
                        {row.absent}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.status === 'Sudah Diisi' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Sudah Diisi
                          </span>
                        ) : row.status === 'Belum Lengkap' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            🟡 Belum Lengkap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🔴 Belum Diisi
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) + ' WITA'
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {row.report_id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onViewReport(row.report_id!)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition flex items-center gap-1"
                              title="Lihat Detail & Download PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            <button
                              onClick={() => handleToggleLock(row.report_id!, row.report_status)}
                              className={`p-1 rounded-lg text-[11px] transition ${
                                row.report_status === 'locked'
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                              }`}
                              title={
                                row.report_status === 'locked'
                                  ? 'Buka Kunci Laporan'
                                  : 'Kunci Laporan'
                              }
                            >
                              {row.report_status === 'locked' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Menunggu Guru</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
