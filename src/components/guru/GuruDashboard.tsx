import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DailyReport } from '../../types';
import {
  FilePlus,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  TrendingUp,
  Sparkles,
  Users,
} from 'lucide-react';

interface GuruDashboardProps {
  onNavigateToForm: (reportId?: string) => void;
  onViewReport: (reportId: string) => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  onNavigateToForm,
  onViewReport,
}) => {
  const { user, teacher, assignedClass, settings } = useAuth();
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadGuruDashboard() {
      if (!assignedClass) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.getReports({ class_id: assignedClass.id });
        const list = res.reports || [];

        // Check if report exists today
        const foundToday = list.find((r) => r.date === todayStr);
        setTodayReport(foundToday || null);

        // Sort and take recent 5
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentReports(list.slice(0, 7));
      } catch (err) {
        console.error('Failed to load guru dashboard', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadGuruDashboard();
  }, [assignedClass, todayStr]);

  const statusBadge = (st: string) => {
    switch (st) {
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3 text-slate-500" /> Terkunci
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
          </span>
        );
      case 'reopened':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Unlock className="w-3 h-3 text-amber-600" /> Dibuka Kembali
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Draf
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Identity & Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/15 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 transform skew-x-12 pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Tahun Pelajaran {settings?.academic_year || '2026/2027'} • {settings?.semester || 'Semester Ganjil'}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Selamat Datang, {teacher?.name || user?.name}!
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            {assignedClass ? (
              <>
                Wali / Guru Piket <strong>Kelas {assignedClass.class_name}</strong> (Tingkat {assignedClass.grade})
                • NIP: {teacher?.nip || '-'}
              </>
            ) : (
              'Guru Piket Sekolah'
            )}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              id="btn-guru-isi-laporan"
              onClick={() => onNavigateToForm(todayReport?.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 text-xs sm:text-sm font-extrabold shadow-lg shadow-black/10 active:scale-95 transition"
            >
              <FilePlus className="w-4 h-4 text-blue-700" />
              <span>
                {todayReport ? 'UBAH LAPORAN HARI INI' : '+ ISI LAPORAN PIKET HARI INI'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Report Status Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Status Laporan Piket Hari Ini
              </h3>
              <p className="text-xs text-slate-500">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div>
            {todayReport ? statusBadge(todayReport.status) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Belum Diisi
              </span>
            )}
          </div>
        </div>

        {todayReport ? (
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 block">Total Siswa</span>
                <span className="text-lg font-black text-slate-900">{todayReport.total_students}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-700 block">Hadir (H)</span>
                <span className="text-lg font-black text-emerald-800">{todayReport.present_count}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-700 block">Sakit (S)</span>
                <span className="text-lg font-black text-amber-800">{todayReport.sick_count}</span>
              </div>
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                <span className="text-[10px] font-bold text-sky-700 block">Izin (I)</span>
                <span className="text-lg font-black text-sky-800">{todayReport.permit_count}</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-700 block">Alpa (A)</span>
                <span className="text-lg font-black text-rose-800">{todayReport.absent_count}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-600">
                Kebersihan: <strong className="text-blue-700">{todayReport.cleanliness_status}</strong> • Tingkat Kehadiran: <strong className="text-emerald-700">{todayReport.attendance_percentage}%</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewReport(todayReport.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Detail</span>
                </button>
                {todayReport.status !== 'locked' && (
                  <button
                    onClick={() => onNavigateToForm(todayReport.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
                  >
                    <span>Ubah Laporan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Laporan piket kelas hari ini belum diserahkan ke Admin.
                </p>
                <p className="text-[11px] text-amber-700">
                  Silakan lengkapi presensi siswa dan catatan piket sebelum jam pelajaran usai.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToForm()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition whitespace-nowrap"
            >
              Isi Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Riwayat Laporan Terakhir
            </h3>
            <p className="text-xs text-slate-500">Laporan piket harian kelas {assignedClass?.class_name}</p>
          </div>
        </div>

        {recentReports.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="text-xs font-medium">Belum ada riwayat laporan tersimpan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tanggal & Hari</th>
                  <th className="py-2.5 px-3 text-center">Hadir</th>
                  <th className="py-2.5 px-3 text-center">Sakit</th>
                  <th className="py-2.5 px-3 text-center">Izin</th>
                  <th className="py-2.5 px-3 text-center">Alpa</th>
                  <th className="py-2.5 px-3 text-center">% Kehadiran</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {rep.date}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {rep.day_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                      {rep.present_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                      {rep.sick_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-sky-700">
                      {rep.permit_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                      {rep.absent_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900">
                      {rep.attendance_percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center">{statusBadge(rep.status)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onViewReport(rep.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
