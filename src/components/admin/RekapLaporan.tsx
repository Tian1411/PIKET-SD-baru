import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DailyReport, SchoolClass, Teacher } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { exportRekapToExcel } from '../../services/exportUtils';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Clock,
  Lock,
} from 'lucide-react';

interface RekapLaporanProps {
  onViewReport: (reportId: string) => void;
}

export const RekapLaporan: React.FC<RekapLaporanProps> = ({ onViewReport }) => {
  const { settings } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadRekap = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedClassId) params.class_id = selectedClassId;
      if (selectedTeacherId) params.teacher_id = selectedTeacherId;
      if (selectedMonth) params.month = selectedMonth;
      if (statusFilter) params.status = statusFilter;

      const [rekapRes, clsRes, tchRes] = await Promise.all([
        api.getAdminRekap(params),
        api.getClasses(),
        api.getTeachers(),
      ]);

      setReports(rekapRes.reports || []);
      setSummary(rekapRes.summary || null);
      setClasses(clsRes.classes || []);
      setTeachers(tchRes.teachers || []);
    } catch (err) {
      console.error('Failed to load rekap', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRekap();
  }, [startDate, endDate, selectedClassId, selectedTeacherId, selectedMonth, statusFilter]);

  const handleExportExcel = () => {
    if (!settings) return;
    const selectedClassName = classes.find((c) => c.id === selectedClassId)?.class_name;
    exportRekapToExcel(reports, settings, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      className: selectedClassName,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Arsip & Ekspor Laporan
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-0.5">
            Rekapitulasi Laporan Piket Harian
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Unduh rekapitulasi kehadiran siswa dan laporan piket dalam format Excel atau cetak resmi.
          </p>
        </div>

        {/* Action Buttons: Excel & Print */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-700/20 disabled:opacity-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            id="btn-print-rekap"
            onClick={handlePrint}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md disabled:opacity-50 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Print</span>
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 print:hidden">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Data Rekapitulasi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.class_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Guru Piket</label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Status Laporan</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Semua Status</option>
              <option value="submitted">Terkirim</option>
              <option value="draft">Draf</option>
              <option value="locked">Terkunci</option>
              <option value="reopened">Dibuka Kembali</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Laporan
            </span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {summary.total_reports}
            </span>
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total Hadir
            </span>
            <span className="text-xl font-black text-emerald-900 mt-1 block">
              {summary.total_present}
            </span>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
              Total Sakit
            </span>
            <span className="text-xl font-black text-amber-900 mt-1 block">
              {summary.total_sick}
            </span>
          </div>

          <div className="bg-sky-50 p-4 rounded-2xl border border-sky-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
              Total Izin
            </span>
            <span className="text-xl font-black text-sky-900 mt-1 block">
              {summary.total_permit}
            </span>
          </div>

          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              Total Alpa
            </span>
            <span className="text-xl font-black text-rose-900 mt-1 block">
              {summary.total_absent}
            </span>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {/* Printable Header for print mode only */}
        <div className="hidden print:block text-center mb-6 pb-4 border-b-2 border-slate-900">
          <h1 className="text-base font-extrabold">{settings?.school_name.toUpperCase()}</h1>
          <h2 className="text-sm font-bold">REKAPITULASI LAPORAN PIKET HARIAN & PRESENSI SISWA</h2>
          <p className="text-xs text-slate-600">
            Tahun Pelajaran: {settings?.academic_year} ({settings?.semester}) • Dicetak Pada:{' '}
            {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat data rekapitulasi...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-bold text-slate-700">Tidak ada data rekapitulasi yang cocok</p>
            <p className="text-xs text-slate-500 mt-1">Coba sesuaikan filter pencarian di atas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">No</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Guru Piket/Wali Kelas</th>
                  <th className="py-3 px-3 text-center">Total</th>
                  <th className="py-3 px-3 text-center text-emerald-700">Hadir</th>
                  <th className="py-3 px-3 text-center text-amber-700">Sakit</th>
                  <th className="py-3 px-3 text-center text-sky-700">Izin</th>
                  <th className="py-3 px-3 text-center text-rose-700">Alpa</th>
                  <th className="py-3 px-3 text-center">% Hadir</th>
                  <th className="py-3 px-3 text-center">Kebersihan</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((rep, idx) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {rep.date}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {rep.day_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{rep.class_name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{rep.teacher_name}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                      {rep.total_students}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700">
                      {rep.present_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-amber-700">
                      {rep.sick_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-sky-700">
                      {rep.permit_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-extrabold text-rose-700">
                      {rep.absent_count}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-slate-900">
                      {rep.attendance_percentage}%
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                      {rep.cleanliness_status}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          rep.status === 'locked'
                            ? 'bg-slate-100 text-slate-700'
                            : rep.status === 'submitted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rep.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right print:hidden">
                      <button
                        onClick={() => onViewReport(rep.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition"
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
