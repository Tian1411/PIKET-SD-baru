import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DailyReport, AttendanceStatus, CleanlinessStatus, Student } from '../../types';
import {
  Calendar,
  Check,
  Zap,
  Save,
  Send,
  AlertTriangle,
  Sparkles,
  Info,
  CheckCircle2,
  Lock,
  ArrowLeft,
} from 'lucide-react';

interface FormLaporanPiketProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialReportId?: string;
}

const PIKET_ACTIVITIES = [
  'Menyapu dan mengepel lantai kelas',
  'Membersihkan papan tulis dan perlengkapan',
  'Merapikan meja, kursi, dan sudut baca',
  'Membuang sampah ke tempat pembuangan akhir',
  'Menyiram tanaman dan membersihkan teras depan',
  'Memastikan jendela dan ventilasi terbuka dengan baik',
];

export const FormLaporanPiket: React.FC<FormLaporanPiketProps> = ({
  onSuccess,
  onCancel,
  initialReportId,
}) => {
  const { user, teacher, assignedClass, settings } = useAuth();

  const [reportDate, setReportDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [dayName, setDayName] = useState<string>('');

  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; note: string }>
  >({});

  const [cleanlinessStatus, setCleanlinessStatus] = useState<CleanlinessStatus>('Baik');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    PIKET_ACTIVITIES[0],
    PIKET_ACTIVITIES[1],
    PIKET_ACTIVITIES[2],
  ]);
  const [incidentNotes, setIncidentNotes] = useState('Tidak ada kejadian khusus.');
  const [followUp, setFollowUp] = useState('');

  const [existingReport, setExistingReport] = useState<DailyReport | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Compute Day Name in Indonesian whenever date changes
  useEffect(() => {
    if (!reportDate) return;
    const parts = reportDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    setDayName(days[d.getDay()]);
  }, [reportDate]);

  // Load students and check existing report for this class and date
  useEffect(() => {
    async function initForm() {
      if (!assignedClass) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setStatusMessage(null);

      try {
        // Fetch class students
        const stdRes = await api.getStudents({ class_id: assignedClass.id });
        const classStudents = stdRes.students || [];
        setStudents(classStudents);

        // Check if report exists for this date or loading specific initialReportId
        let rep: DailyReport | null = null;
        if (initialReportId) {
          const detailRes = await api.getReportDetail(initialReportId);
          rep = detailRes.report;
        } else {
          const checkRes = await api.checkReportDuplicate(assignedClass.id, reportDate);
          if (checkRes.exists && checkRes.report) {
            rep = checkRes.report;
          }
        }

        if (rep) {
          setExistingReport(rep);
          setCleanlinessStatus(rep.cleanliness_status);
          setSelectedActivities(rep.activity_notes || []);
          setIncidentNotes(rep.incident_notes || '');
          setFollowUp(rep.follow_up || '');
          setIsLocked(rep.status === 'locked');

          // Map attendance
          const map: Record<string, { status: AttendanceStatus; note: string }> = {};
          if (rep.attendance && rep.attendance.length > 0) {
            rep.attendance.forEach((att) => {
              map[att.student_id] = { status: att.status, note: att.note || '' };
            });
          } else {
            // Default all H
            classStudents.forEach((s) => {
              map[s.id] = { status: 'H', note: '' };
            });
          }
          setAttendanceMap(map);

          if (rep.status === 'locked') {
            setStatusMessage({
              type: 'info',
              text: 'Laporan ini telah DIKUNCI oleh Admin. Hanya Admin yang dapat membukanya kembali untuk diedit.',
            });
          }
        } else {
          setExistingReport(null);
          setIsLocked(false);

          // Check if there is draft in localStorage
          const localDraftKey = `draft_piket_${assignedClass.id}_${reportDate}`;
          const localDraft = localStorage.getItem(localDraftKey);

          if (localDraft) {
            try {
              const parsed = JSON.parse(localDraft);
              setAttendanceMap(parsed.attendanceMap || {});
              setCleanlinessStatus(parsed.cleanlinessStatus || 'Baik');
              setSelectedActivities(parsed.selectedActivities || []);
              setIncidentNotes(parsed.incidentNotes || 'Tidak ada kejadian khusus.');
              setFollowUp(parsed.followUp || '');
              setStatusMessage({
                type: 'info',
                text: 'Draf lokal yang belum tersimpan berhasil dipulihkan.',
              });
            } catch (e) {
              initDefaultAttendance(classStudents);
            }
          } else {
            initDefaultAttendance(classStudents);
          }
        }
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Gagal memuat data kelas dan siswa.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    initForm();
  }, [assignedClass, reportDate, initialReportId]);

  const initDefaultAttendance = (stdList: Student[]) => {
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};
    stdList.forEach((s) => {
      map[s.id] = { status: 'H', note: '' };
    });
    setAttendanceMap(map);
  };

  // Quick Action: Mark All as Present
  const handleMarkAllPresent = () => {
    const newMap = { ...attendanceMap };
    students.forEach((s) => {
      newMap[s.id] = { status: 'H', note: '' };
    });
    setAttendanceMap(newMap);
  };

  // Individual student status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isLocked) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        note: status === 'H' ? '' : prev[studentId]?.note || '',
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    if (isLocked) return;
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  // Real-time counter calculation
  const counters = useMemo(() => {
    let present = 0;
    let sick = 0;
    let permit = 0;
    let absent = 0;

    students.forEach((s) => {
      const att = attendanceMap[s.id];
      if (att) {
        if (att.status === 'H') present++;
        else if (att.status === 'S') sick++;
        else if (att.status === 'I') permit++;
        else if (att.status === 'A') absent++;
      }
    });

    const total = students.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, sick, permit, absent, percentage };
  }, [students, attendanceMap]);

  // Activity toggle
  const toggleActivity = (act: string) => {
    if (isLocked) return;
    setSelectedActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  // Save as Draft or Submit
  const handleSave = async (isSubmit: boolean) => {
    if (!assignedClass || !teacher) {
      alert('Informasi kelas dan guru tidak lengkap.');
      return;
    }

    if (students.length === 0) {
      alert('Tidak ada siswa di kelas ini.');
      return;
    }

    // Validation: check that every student has attendance status
    const unselected = students.filter((s) => !attendanceMap[s.id]?.status);
    if (unselected.length > 0) {
      alert(`Mohon lengkapi status kehadiran untuk seluruh siswa. (${unselected.length} siswa belum diisi)`);
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const attendance_items = students.map((s) => ({
      student_id: s.id,
      student_nis: s.nis,
      student_nisn: s.nisn,
      student_name: s.name,
      student_gender: s.gender,
      status: attendanceMap[s.id]?.status || 'H',
      note: attendanceMap[s.id]?.note || '',
    }));

    const payload = {
      class_id: assignedClass.id,
      date: reportDate,
      day_name: dayName,
      academic_year: settings?.academic_year || assignedClass.academic_year || '2026/2027',
      semester: settings?.semester || 'Semester Ganjil',
      cleanliness_status: cleanlinessStatus,
      activity_notes: selectedActivities,
      incident_notes: incidentNotes.trim() || 'Tidak ada kejadian khusus.',
      follow_up: followUp.trim(),
      attendance_items,
      status: isSubmit ? 'submitted' : 'draft',
    };

    try {
      if (existingReport) {
        await api.updateReport(existingReport.id, payload as any);
      } else {
        await api.submitReport(payload as any);
      }

      // Clear local draft
      const localDraftKey = `draft_piket_${assignedClass.id}_${reportDate}`;
      localStorage.removeItem(localDraftKey);

      setStatusMessage({
        type: 'success',
        text: isSubmit
          ? 'Laporan piket harian berhasil dikirim ke Admin!'
          : 'Draf laporan berhasil disimpan.',
      });

      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan laporan piket.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Bar with Back button & Heading */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="text-right">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Formulir Piket
          </span>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            Kelas {assignedClass?.class_name}
          </h2>
        </div>
      </div>

      {/* Alerts */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 p-4 rounded-2xl border text-xs font-semibold animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : statusMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Menyiapkan formulir piket...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: Identitas Otomatis */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>1. Identitas Laporan Piket</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Tanggal Piket
                </label>
                <input
                  type="date"
                  value={reportDate}
                  disabled={isLocked}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-blue-700 font-bold mt-1 block">
                  Hari: {dayName}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guru Piket / Wali Kelas
                </label>
                <input
                  type="text"
                  readOnly
                  value={teacher?.name || user?.name || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  NIP: {teacher?.nip || '-'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Pelajaran & Semester
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${settings?.academic_year || '2026/2027'} (${settings?.semester || 'Semester Ganjil'})`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Kelas: {assignedClass?.class_name}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Presensi Siswa & Quick Action */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  2. Presensi Siswa
                </h3>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  Daftar Siswa Kelas {assignedClass?.class_name} ({students.length} Siswa)
                </p>
              </div>

              {/* Quick Fill Button: 1-Click All Present */}
              {!isLocked && (
                <button
                  type="button"
                  id="btn-all-present"
                  onClick={handleMarkAllPresent}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 transition"
                  title="Klik untuk menandai seluruh siswa hadir"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>⚡ SEMUA HADIR</span>
                </button>
              )}
            </div>

            {/* Real-time Attendance Counter Pill */}
            <div className="my-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-5 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block">Total</span>
                <span className="text-base font-black text-slate-900">{counters.total}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 block">Hadir (H)</span>
                <span className="text-base font-black text-emerald-700">{counters.present}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 block">Sakit (S)</span>
                <span className="text-base font-black text-amber-700">{counters.sick}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-sky-600 block">Izin (I)</span>
                <span className="text-base font-black text-sky-700">{counters.permit}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 block">Alpa (A)</span>
                <span className="text-base font-black text-rose-700">{counters.absent}</span>
              </div>
            </div>

            {/* Student List */}
            <div className="space-y-2 mt-4 max-h-[480px] overflow-y-auto pr-1">
              {students.map((student, idx) => {
                const currentStatus = attendanceMap[student.id]?.status || 'H';
                const currentNote = attendanceMap[student.id]?.note || '';
                const isNonPresent = currentStatus !== 'H';

                return (
                  <div
                    key={student.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isNonPresent
                        ? 'border-amber-300 bg-amber-50/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Student Info */}
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {student.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {student.gender === 'P' ? 'Perempuan' : 'Laki-laki'} • NIS: {student.nis}
                          </p>
                        </div>
                      </div>

                      {/* Tactile Attendance Status Buttons [H] [S] [I] [A] */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* HADIR */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStatusChange(student.id, 'H')}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center ${
                            currentStatus === 'H'
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title="Hadir"
                        >
                          H
                        </button>

                        {/* SAKIT */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStatusChange(student.id, 'S')}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center ${
                            currentStatus === 'S'
                              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title="Sakit"
                        >
                          S
                        </button>

                        {/* IZIN */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStatusChange(student.id, 'I')}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center ${
                            currentStatus === 'I'
                              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                          }`}
                          title="Izin"
                        >
                          I
                        </button>

                        {/* ALPA */}
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => handleStatusChange(student.id, 'A')}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center ${
                            currentStatus === 'A'
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                          title="Alpa / Tanpa Keterangan"
                        >
                          A
                        </button>
                      </div>
                    </div>

                    {/* Conditional Note Field if S/I/A */}
                    {isNonPresent && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                          Keterangan ({currentStatus}):
                        </span>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={currentNote}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          placeholder={
                            currentStatus === 'S'
                              ? 'Contoh: Sakit demam berdarah / ada surat dokter'
                              : currentStatus === 'I'
                              ? 'Contoh: Acara keluarga di luar kota'
                              : 'Contoh: Tidak ada kabar dari orang tua'
                          }
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Kondisi Kebersihan & Kegiatan Piket */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>3. Kondisi Kebersihan Kelas</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['Sangat Baik', 'Baik', 'Cukup', 'Perlu Perhatian'] as CleanlinessStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={isLocked}
                      onClick={() => setCleanlinessStatus(st)}
                      className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                        cleanlinessStatus === st
                          ? 'border-blue-700 bg-blue-50 text-blue-800 ring-2 ring-blue-700/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                Kegiatan Piket yang Terlaksana Hari Ini
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PIKET_ACTIVITIES.map((act) => (
                  <label
                    key={act}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-medium text-slate-700"
                  >
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={selectedActivities.includes(act)}
                      onChange={() => toggleActivity(act)}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span>{act}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: Catatan Kejadian & Tindak Lanjut */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              4. Catatan Khusus & Tindak Lanjut
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Kejadian Khusus (Opsional)
              </label>
              <textarea
                rows={2}
                disabled={isLocked}
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                placeholder="Contoh: Lampu kelas bagian belakang berkedip, 1 meja siswa perlu diperbaiki..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tindak Lanjut yang Dilakukan / Diperlukan (Opsional)
              </label>
              <textarea
                rows={2}
                disabled={isLocked}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Contoh: Sudah melapor ke staf tata usaha untuk penggantian bola lampu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
            >
              Batal
            </button>

            {!isLocked && (
              <>
                <button
                  type="button"
                  id="btn-save-draft"
                  disabled={isSubmitting}
                  onClick={() => handleSave(false)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition"
                >
                  <Save className="w-4 h-4 text-slate-600" />
                  <span>Simpan Draf</span>
                </button>

                <button
                  type="button"
                  id="btn-submit-report"
                  disabled={isSubmitting}
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold shadow-md shadow-blue-700/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim Laporan Piket'}</span>
                </button>
              </>
            )}

            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold border border-slate-300">
                <Lock className="w-4 h-4" />
                <span>Laporan Telah Dikunci oleh Admin</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
