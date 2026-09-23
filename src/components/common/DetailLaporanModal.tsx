import React, { useState, useEffect } from 'react';
import { DailyReport, SchoolSettings } from '../../types';
import { api } from '../../services/api';
import { exportSingleReportPDF } from '../../services/exportUtils';
import {
  X,
  Printer,
  FileDown,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface DetailLaporanModalProps {
  reportId: string;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (report: DailyReport) => void;
  onStatusChanged?: () => void;
}

export const DetailLaporanModal: React.FC<DetailLaporanModalProps> = ({
  reportId,
  isOpen,
  isAdmin,
  onClose,
  onEdit,
  onStatusChanged,
}) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [teacher, setTeacher] = useState<any>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !reportId) return;

    async function loadData() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        if (isAdmin) {
          const res = await api.getReportPdfData(reportId);
          setReport(res.report);
          setAttendance(res.attendance);
          setTeacher(res.teacher);
          setSettings(res.settings);
        } else {
          const res = await api.getReportDetail(reportId);
          setReport(res.report);
          setAttendance(res.report.attendance || []);
          setTeacher({ name: res.report.teacher_name, nip: '-' });
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Gagal memuat detail laporan.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen, reportId, isAdmin]);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    if (!report || !settings) return;
    await exportSingleReportPDF({
      settings,
      report,
      teacher: teacher || { name: report.teacher_name, nip: '-' },
      attendance,
    });
  };

  const handleToggleLock = async () => {
    if (!report) return;
    setActionLoading(true);
    try {
      if (report.status === 'locked') {
        const res = await api.reopenReport(report.id);
        setReport(res.report);
      } else {
        const res = await api.lockReport(report.id);
        setReport(res.report);
      }
      onStatusChanged?.();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status laporan.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3 text-slate-500" /> Terkunci (Locked)
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim (Submitted)
          </span>
        );
      case 'reopened':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Unlock className="w-3 h-3 text-amber-600" /> Dibuka Kembali
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" /> Draf (Draft)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-xs">
              <img
                src={settings?.logo_url || '/school-logo.png'}
                alt="Logo Sekolah"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Detail Laporan Piket Kelas {report?.class_name}
              </h3>
              <p className="text-xs text-slate-500">
                {report ? `${report.day_name}, ${report.date}` : 'Memuat data...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium">Memuat detail laporan...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{errorMsg}</span>
            </div>
          ) : report ? (
            <>
              {/* Meta Card */}
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Status Laporan</span>
                  <div className="mt-1">{statusBadge(report.status)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Guru Piket</span>
                  <span className="font-bold text-slate-800 mt-1 block truncate">
                    {report.teacher_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Tahun & Semester</span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {report.academic_year} ({report.semester})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Waktu Pengisian</span>
                  <span className="font-bold text-slate-800 mt-1 block">
                    {report.submitted_at
                      ? new Date(report.submitted_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }) + ' WITA'
                      : '-'}
                  </span>
                </div>
              </div>

              {/* Attendance Counter Grid */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Ringkasan Presensi Siswa
                </h4>
                <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-xs font-bold text-blue-700 block">Total</span>
                    <span className="text-lg font-extrabold text-blue-900">{report.total_students}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-700 block">Hadir</span>
                    <span className="text-lg font-extrabold text-emerald-900">{report.present_count}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-xs font-bold text-amber-700 block">Sakit</span>
                    <span className="text-lg font-extrabold text-amber-900">{report.sick_count}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                    <span className="text-xs font-bold text-sky-700 block">Izin</span>
                    <span className="text-lg font-extrabold text-sky-900">{report.permit_count}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs font-bold text-rose-700 block">Alpa</span>
                    <span className="text-lg font-extrabold text-rose-900">{report.absent_count}</span>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs font-semibold text-slate-600">
                    Tingkat Kehadiran: <strong className="text-blue-700">{report.attendance_percentage}%</strong>
                  </span>
                </div>
              </div>

              {/* Student Attendance List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Daftar Presensi ({attendance.length} Siswa)
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">No</th>
                          <th className="py-2 px-3">Nama Siswa</th>
                          <th className="py-2 px-3 w-12 text-center">L/P</th>
                          <th className="py-2 px-3 w-20 text-center">Status</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendance.map((att, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {att.student_name || att.name}
                              <span className="block text-[10px] text-slate-400 font-mono">
                                NIS: {att.student_nis || att.nis}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600">
                              {att.student_gender || att.gender}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                                  att.status === 'H'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : att.status === 'S'
                                    ? 'bg-amber-100 text-amber-800'
                                    : att.status === 'I'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {att.status === 'H'
                                  ? 'HADIR'
                                  : att.status === 'S'
                                  ? 'SAKIT'
                                  : att.status === 'I'
                                  ? 'IZIN'
                                  : 'ALPA'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{att.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Kebersihan & Kegiatan Piket */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-bold text-slate-800">Kondisi Kebersihan Kelas</h5>
                  </div>
                  <p className="text-sm font-extrabold text-blue-800">
                    {report.cleanliness_status}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3.5 bg-slate-50/50">
                  <h5 className="text-xs font-bold text-slate-800 mb-1.5">Kegiatan Piket Terlaksana</h5>
                  {report.activity_notes && report.activity_notes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {report.activity_notes.map((act, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                        >
                          ✓ {act}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Tidak ada data kegiatan.</span>
                  )}
                </div>
              </div>

              {/* Catatan Kejadian & Tindak Lanjut */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3.5 bg-white">
                  <h5 className="text-xs font-bold text-slate-700 mb-1">Catatan Kejadian Khusus</h5>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {report.incident_notes || 'Tidak ada kejadian khusus hari ini.'}
                  </p>
                </div>

                {report.follow_up && (
                  <div className="rounded-xl border border-slate-200 p-3.5 bg-white">
                    <h5 className="text-xs font-bold text-slate-700 mb-1">Tindak Lanjut</h5>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {report.follow_up}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {/* Guru can edit if not locked */}
            {!isAdmin && onEdit && report && report.status !== 'locked' && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(report);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Ubah Laporan</span>
              </button>
            )}

            {/* Admin only actions */}
            {isAdmin && report && (
              <>
                <button
                  onClick={handleToggleLock}
                  disabled={actionLoading}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    report.status === 'locked'
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  }`}
                  title={report.status === 'locked' ? 'Buka Kunci Laporan' : 'Kunci Laporan'}
                >
                  {report.status === 'locked' ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Laporan</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-modal-export-pdf"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm transition"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
