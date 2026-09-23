import { Router, Response } from 'express';
import { getDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';

const router = Router();

// GET /api/export/report-pdf-data/:id (Admin only)
router.get('/report-pdf-data/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminUser = req.user!;
  const db = getDB();

  const report = db.daily_reports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Laporan tidak ditemukan.' });
  }

  const attendance = db.attendance.filter((a) => a.report_id === id);
  const teacher = db.teachers.find((t) => t.id === report.teacher_id);
  const settings = db.school_settings;

  // Enrich attendance with student info if not already cached
  const enrichedAttendance = attendance.map((att, idx) => {
    const student = db.students.find((s) => s.id === att.student_id);
    return {
      no: idx + 1,
      nis: att.student_nis || student?.nis || '-',
      nisn: att.student_nisn || student?.nisn || '-',
      name: att.student_name || student?.name || '-',
      gender: att.student_gender || student?.gender || 'L',
      status: att.status,
      status_label: att.status === 'H' ? 'Hadir' : att.status === 'S' ? 'Sakit' : att.status === 'I' ? 'Izin' : 'Alpa',
      note: att.note || '-',
    };
  });

  logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'EXPORT_LAPORAN_PDF',
    'daily_reports',
    `Admin mengekspor/mencetak dokumen PDF laporan piket kelas ${report.class_name} tanggal ${report.date}.`,
    report.id
  );

  return res.json({
    settings,
    report,
    teacher: {
      name: report.teacher_name,
      nip: teacher?.nip || '-',
    },
    attendance: enrichedAttendance,
  });
});

// GET /api/export/rekap-data (Admin only)
router.get('/rekap-data', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const adminUser = req.user!;
  const db = getDB();
  const { start_date, end_date, class_id, teacher_id, month, academic_year } = req.query;

  let reports = [...db.daily_reports];

  if (start_date && end_date) {
    reports = reports.filter((r) => r.date >= String(start_date) && r.date <= String(end_date));
  } else if (start_date) {
    reports = reports.filter((r) => r.date >= String(start_date));
  } else if (end_date) {
    reports = reports.filter((r) => r.date <= String(end_date));
  }

  if (month) {
    reports = reports.filter((r) => r.date.startsWith(String(month)));
  }

  if (academic_year) {
    reports = reports.filter((r) => r.academic_year === String(academic_year));
  }

  if (class_id) {
    reports = reports.filter((r) => r.class_id === String(class_id));
  }

  if (teacher_id) {
    reports = reports.filter((r) => r.teacher_id === String(teacher_id));
  }

  reports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'EXPORT_REKAP_EXCEL',
    'daily_reports',
    `Admin mengunduh rekapitulasi data laporan piket (${reports.length} data laporan).`
  );

  return res.json({
    settings: db.school_settings,
    reports,
  });
});

export default router;
