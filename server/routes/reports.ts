import { Router, Response } from 'express';
import { getDB, saveDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';
import { DailyReport, AttendanceRecord, AttendanceStatus, ReportStatus } from '../../src/types';

const router = Router();

function getIndonesianDayName(dateStr: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(dateStr + 'T00:00:00Z');
  return days[d.getUTCDay()] || 'Senin';
}

// GET /api/reports
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDB();
  const { date, month, year, class_id, teacher_id, status, search } = req.query;

  let reports = [...db.daily_reports];

  // Role restriction: Guru can ONLY see reports for their assigned class
  if (user.role === 'guru') {
    if (!user.teacher || !user.teacher.class_id) {
      return res.json({ reports: [] });
    }
    reports = reports.filter((r) => r.class_id === user.teacher!.class_id);
  } else if (class_id) {
    reports = reports.filter((r) => r.class_id === String(class_id));
  }

  // Filter by date
  if (date) {
    reports = reports.filter((r) => r.date === String(date));
  }

  // Filter by month (YYYY-MM)
  if (month) {
    reports = reports.filter((r) => r.date.startsWith(String(month)));
  }

  // Filter by year (YYYY)
  if (year) {
    reports = reports.filter((r) => r.date.startsWith(String(year)));
  }

  // Filter by teacher
  if (teacher_id) {
    reports = reports.filter((r) => r.teacher_id === String(teacher_id));
  }

  // Filter by status
  if (status) {
    reports = reports.filter((r) => r.status === String(status));
  }

  // Search by class or teacher name
  if (search) {
    const q = String(search).toLowerCase();
    reports = reports.filter(
      (r) =>
        (r.class_name && r.class_name.toLowerCase().includes(q)) ||
        (r.teacher_name && r.teacher_name.toLowerCase().includes(q)) ||
        r.incident_notes.toLowerCase().includes(q)
    );
  }

  // Sort descending by date
  reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return res.json({ reports });
});

// GET /api/reports/check/:class_id/:date
router.get('/check/:class_id/:date', authenticate, (req: AuthRequest, res: Response) => {
  const { class_id, date } = req.params;
  const db = getDB();
  const existing = db.daily_reports.find((r) => r.class_id === class_id && r.date === date);

  if (existing) {
    return res.json({
      exists: true,
      report: existing,
      message: `Laporan piket untuk kelas ${existing.class_name} tanggal ${existing.date} sudah ada (${existing.status.toUpperCase()}).`,
    });
  }

  return res.json({ exists: false });
});

// GET /api/reports/:id
router.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const report = db.daily_reports.find((r) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  // Authorization check: Guru cannot see reports of other classes
  if (user.role === 'guru') {
    if (!user.teacher || user.teacher.class_id !== report.class_id) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke laporan kelas ini.' });
    }
  }

  const attendance = db.attendance.filter((a) => a.report_id === report.id);

  return res.json({
    report: {
      ...report,
      attendance,
    },
  });
});

// POST /api/reports
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDB();
  const {
    date,
    class_id,
    cleanliness_status,
    activity_notes,
    incident_notes,
    follow_up,
    status = 'submitted',
    attendance_items, // Array of { student_id, status: 'H'|'S'|'I'|'A', note: '' }
  } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Tanggal laporan wajib diisi.' });
  }

  if (!class_id) {
    return res.status(400).json({ error: 'Kelas wajib dipilih.' });
  }

  // Validate Class exists
  const targetClass = db.classes.find((c) => c.id === class_id && c.status === 'active');
  if (!targetClass) {
    return res.status(400).json({ error: 'Data kelas tidak ditemukan.' });
  }

  // Role validation: Guru can only submit for their assigned class
  if (user.role === 'guru') {
    if (!user.teacher || user.teacher.class_id !== class_id) {
      return res.status(403).json({ error: 'Guru hanya dapat membuat laporan untuk kelas yang ditugaskan.' });
    }
  }

  // Teacher Info
  const teacher =
    user.role === 'guru'
      ? user.teacher
      : db.teachers.find((t) => t.class_id === class_id) || {
          id: 'admin_sys',
          name: user.name,
        };

  // Check duplicate report for class & date
  const existingReport = db.daily_reports.find((r) => r.class_id === class_id && r.date === date);
  if (existingReport) {
    return res.status(400).json({
      error: `Laporan piket untuk kelas ${targetClass.class_name} tanggal ${date} sudah tersedia (${existingReport.status.toUpperCase()}).`,
    });
  }

  // Fetch active students in this class
  const classStudents = db.students.filter((s) => s.class_id === class_id && s.status === 'active');

  if (classStudents.length === 0) {
    return res.status(400).json({ error: 'Kelas ini belum memiliki data siswa terdaftar.' });
  }

  // Validate attendance entries
  const attendanceList: { student_id: string; status: AttendanceStatus; note?: string }[] = attendance_items || [];

  if (status === 'submitted') {
    const missingStudents = classStudents.filter(
      (cs) => !attendanceList.some((a) => a.student_id === cs.id && a.status)
    );

    if (missingStudents.length > 0) {
      return res.status(400).json({
        error: `Data belum lengkap. Silakan periksa kembali: masih ada ${missingStudents.length} siswa tanpa status kehadiran.`,
      });
    }
  }

  // Calculate statistics
  let present = 0;
  let sick = 0;
  let permit = 0;
  let absent = 0;

  attendanceList.forEach((a) => {
    if (a.status === 'H') present++;
    else if (a.status === 'S') sick++;
    else if (a.status === 'I') permit++;
    else if (a.status === 'A') absent++;
  });

  const total = classStudents.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const now = new Date().toISOString();
  const reportId = `rep_${date}_${class_id}`;

  const newReport: DailyReport = {
    id: reportId,
    date,
    day_name: getIndonesianDayName(date),
    class_id,
    class_name: targetClass.class_name,
    teacher_id: teacher?.id || 'unknown',
    teacher_name: teacher?.name || user.name,
    semester: db.school_settings.semester || 'Ganjil',
    academic_year: db.school_settings.academic_year || '2026/2027',
    cleanliness_status: cleanliness_status || 'Baik',
    activity_notes: Array.isArray(activity_notes) ? activity_notes : [],
    incident_notes: incident_notes?.trim() || 'Tidak ada kejadian khusus.',
    follow_up: follow_up?.trim() || '-',
    status: status as ReportStatus,
    total_students: total,
    present_count: present,
    sick_count: sick,
    permit_count: permit,
    absent_count: absent,
    attendance_percentage: percentage,
    submitted_at: status === 'submitted' ? now : undefined,
    updated_at: now,
  };

  db.daily_reports.unshift(newReport);

  // Save attendance items
  classStudents.forEach((st) => {
    const matched = attendanceList.find((a) => a.student_id === st.id);
    const stat: AttendanceStatus = matched?.status || 'H';
    const note = matched?.note || '';

    db.attendance.push({
      id: `att_${reportId}_${st.id}`,
      report_id: reportId,
      student_id: st.id,
      student_name: st.name,
      student_nis: st.nis,
      student_nisn: st.nisn,
      student_gender: st.gender,
      status: stat,
      note,
    });
  });

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    status === 'submitted' ? 'KIRIM_LAPORAN' : 'SIMPAN_DRAFT_LAPORAN',
    'daily_reports',
    `${user.name} membuat laporan piket kelas ${targetClass.class_name} tanggal ${date} (${status.toUpperCase()}).`,
    reportId
  );

  return res.status(201).json({
    message:
      status === 'submitted'
        ? 'Laporan piket harian berhasil dikirim.'
        : 'Draft laporan piket harian berhasil disimpan.',
    report: newReport,
  });
});

// PUT /api/reports/:id
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const report = db.daily_reports.find((r) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  // Authorization check
  if (user.role === 'guru') {
    if (!user.teacher || user.teacher.class_id !== report.class_id) {
      return res.status(403).json({ error: 'Tidak memiliki akses untuk mengubah laporan kelas ini.' });
    }
    // Guru cannot edit locked report
    if (report.status === 'locked') {
      return res.status(403).json({ error: 'Laporan telah dikunci oleh Admin dan tidak dapat diubah.' });
    }
  }

  const {
    cleanliness_status,
    activity_notes,
    incident_notes,
    follow_up,
    status,
    attendance_items,
  } = req.body;

  const now = new Date().toISOString();

  if (cleanliness_status) report.cleanliness_status = cleanliness_status;
  if (activity_notes !== undefined) report.activity_notes = activity_notes;
  if (incident_notes !== undefined) report.incident_notes = incident_notes.trim();
  if (follow_up !== undefined) report.follow_up = follow_up.trim();

  // If status is transitioning to submitted
  if (status && status !== report.status) {
    if (status === 'submitted' && !report.submitted_at) {
      report.submitted_at = now;
    }
    report.status = status as ReportStatus;
  }

  report.updated_at = now;

  // Update attendance if provided
  if (Array.isArray(attendance_items) && attendance_items.length > 0) {
    let present = 0;
    let sick = 0;
    let permit = 0;
    let absent = 0;

    attendance_items.forEach((item: { student_id: string; status: AttendanceStatus; note?: string }) => {
      let rec = db.attendance.find((a) => a.report_id === report.id && a.student_id === item.student_id);
      if (rec) {
        rec.status = item.status;
        rec.note = item.note || '';
      } else {
        const st = db.students.find((s) => s.id === item.student_id);
        if (st) {
          db.attendance.push({
            id: `att_${report.id}_${st.id}`,
            report_id: report.id,
            student_id: st.id,
            student_name: st.name,
            student_nis: st.nis,
            student_nisn: st.nisn,
            student_gender: st.gender,
            status: item.status,
            note: item.note || '',
          });
        }
      }

      if (item.status === 'H') present++;
      else if (item.status === 'S') sick++;
      else if (item.status === 'I') permit++;
      else if (item.status === 'A') absent++;
    });

    report.present_count = present;
    report.sick_count = sick;
    report.permit_count = permit;
    report.absent_count = absent;
    if (report.total_students > 0) {
      report.attendance_percentage = Math.round((present / report.total_students) * 100);
    }
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'UBAH_LAPORAN',
    'daily_reports',
    `${user.name} memperbarui data laporan piket kelas ${report.class_name} tanggal ${report.date}.`,
    report.id
  );

  return res.json({
    message: 'Laporan berhasil diperbarui.',
    report,
  });
});

// POST /api/reports/:id/lock (Admin only)
router.post('/:id/lock', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const report = db.daily_reports.find((r) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  report.status = 'locked';
  report.locked_at = new Date().toISOString();
  report.locked_by = user.id;
  report.updated_at = new Date().toISOString();

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'KUNCI_LAPORAN',
    'daily_reports',
    `Admin mengunci laporan piket kelas ${report.class_name} tanggal ${report.date}.`,
    report.id
  );

  return res.json({ message: 'Laporan berhasil dikunci.', report });
});

// POST /api/reports/:id/reopen (Admin only)
router.post('/:id/reopen', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const report = db.daily_reports.find((r) => r.id === id);

  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  report.status = 'reopened';
  report.locked_at = undefined;
  report.locked_by = undefined;
  report.updated_at = new Date().toISOString();

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'BUKA_KEMBALI_LAPORAN',
    'daily_reports',
    `Admin membuka kembali laporan kelas ${report.class_name} tanggal ${report.date} untuk revisi.`,
    report.id
  );

  return res.json({ message: 'Laporan dibuka kembali untuk revisi guru.', report });
});

// DELETE /api/reports/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const reportIdx = db.daily_reports.findIndex((r) => r.id === id);

  if (reportIdx === -1) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  const report = db.daily_reports[reportIdx];
  db.daily_reports.splice(reportIdx, 1);
  db.attendance = db.attendance.filter((a) => a.report_id !== id);

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'HAPUS_LAPORAN',
    'daily_reports',
    `Admin menghapus laporan kelas ${report.class_name} tanggal ${report.date}.`,
    id
  );

  return res.json({ message: 'Laporan berhasil dihapus.' });
});

export default router;
