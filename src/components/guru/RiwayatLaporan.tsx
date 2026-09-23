import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DailyReport } from '../../types';
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Eye,
  Edit3,
  Filter,
} from 'lucide-react';

interface RiwayatLaporanProps {
  onViewReport: (reportId: string) => void;
  onEditReport: (report: DailyReport) => void;
}

export const RiwayatLaporan: React.FC<RiwayatLaporanProps> = ({
  onViewReport,
  onEditReport,
}) => {
  const { assignedClass } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    async function loadReports() {
      if (!assignedClass) return;
      setIsLoading(true);
      try {
        const params: Record<string, string> = { class_id: assignedClass.id };
        if (selectedMonth) params.month = selectedMonth;
        if (statusFilter) params.status = statusFilter;

        const res = await api.getReports(params);
        setReports(res.reports || []);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadReports();
  }, [assignedClass, selectedMonth, statusFilter]);

  const filteredReports = reports.filter((r) => {
    if (searchDate && !r.date.includes(searchDate)) return false;
    return true;
  });

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            Riwayat Laporan Piket
          </h2>
          <p className="text-xs text-slate-500">
            Arsip seluruh laporan piket harian kelas {assignedClass?.class_name}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="">Semua Status</option>
            <option value="submitted">Terkirim</option>
            <option value="draft">Draf</option>
            <option value="locked">Terkunci</option>
            <option value="reopened">Dibuka Kembali</option>
          </select>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat riwayat laporan...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Tidak ada laporan ditemukan</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah filter tanggal atau mulai isi laporan piket hari ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Tanggal & Hari</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                  <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                  <th className="py-3 px-3 text-center text-sky-700">Izin</th>
                  <th className="py-3 px-3 text-center text-rose-700">Alpa</th>
                  <th className="py-3 px-3 text-center">% Kehadiran</th>
                  <th className="py-3 px-3 text-center">Kebersihan</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {rep.date}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {rep.day_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-600">
                      {rep.total_students}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-emerald-700">
                      {rep.present_count}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-amber-700">
                      {rep.sick_count}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-sky-700">
                      {rep.permit_count}
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-rose-700">
                      {rep.absent_count}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      {rep.attendance_percentage}%
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700 font-medium">
                      {rep.cleanliness_status}
                    </td>
                    <td className="py-3 px-3 text-center">{statusBadge(rep.status)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewReport(rep.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                        >
                          Lihat
                        </button>
                        {rep.status !== 'locked' && (
                          <button
                            onClick={() => onEditReport(rep)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
                          >
                            Ubah
                          </button>
                        )}
                      </div>
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
