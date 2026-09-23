import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB, saveDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';
import { DashboardAdminStats, User, SchoolSettings } from '../../src/types';

const router = Router();

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = getDB();

  const activeClasses = db.classes.filter((c) => c.status === 'active');
  const activeStudents = db.students.filter((s) => s.status === 'active');
  const activeTeachers = db.teachers.filter((t) => t.status === 'active');

  // Today in local/UTC date string YYYY-MM-DD
  const todayStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const todayReports = db.daily_reports.filter((r) => r.date === todayStr);

  let todayPresent = 0;
  let todaySick = 0;
  let todayPermit = 0;
  let todayAbsent = 0;

  todayReports.forEach((r) => {
    todayPresent += r.present_count || 0;
    todaySick += r.sick_count || 0;
    todayPermit += r.permit_count || 0;
    todayAbsent += r.absent_count || 0;
  });

  const todayStatusList = activeClasses.map((cls) => {
    const report = todayReports.find((r) => r.class_id === cls.id);
    const teacher = db.teachers.find((t) => t.class_id === cls.id && t.status === 'active');
    const classStudents = activeStudents.filter((s) => s.class_id === cls.id);

    let statusText: 'Sudah Diisi' | 'Belum Lengkap' | 'Belum Diisi' = 'Belum Diisi';
    if (report) {
      if (report.status === 'submitted' || report.status === 'locked') {
        statusText = 'Sudah Diisi';
      } else {
        statusText = 'Belum Lengkap';
      }
    }

    return {
      class_id: cls.id,
      class_name: cls.class_name,
      teacher_name: teacher?.name || cls.teacher_name || 'Belum Ditugaskan',
      total_students: classStudents.length,
      present: report?.present_count || 0,
      sick: report?.sick_count || 0,
      permit: report?.permit_count || 0,
      absent: report?.absent_count || 0,
      status: statusText,
      report_status: report?.status,
      report_id: report?.id,
      submitted_at: report?.submitted_at,
    };
  });

  // Sort by class name
  todayStatusList.sort((a, b) => a.class_name.localeCompare(b.class_name));

  const notFilledCount = todayStatusList.filter((s) => s.status === 'Belum Diisi').length;

  const stats: DashboardAdminStats = {
    total_classes: activeClasses.length,
    total_students: activeStudents.length,
    active_teachers: activeTeachers.length,
    reports_today: todayReports.length,
    today_present: todayPresent,
    today_sick: todaySick,
    today_permit: todayPermit,
    today_absent: todayAbsent,
    today_not_filled_classes: notFilledCount,
    today_status_list: todayStatusList,
  };

  return res.json(stats);
});

// GET /api/admin/rekap
router.get('/rekap', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const { start_date, end_date, class_id, teacher_id, month, academic_year, status } = req.query;

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

  if (status) {
    reports = reports.filter((r) => r.status === String(status));
  }

  reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Aggregate totals
  const totalStudentsAccum = reports.reduce((acc, r) => acc + (r.total_students || 0), 0);
  const totalPresent = reports.reduce((acc, r) => acc + (r.present_count || 0), 0);
  const totalSick = reports.reduce((acc, r) => acc + (r.sick_count || 0), 0);
  const totalPermit = reports.reduce((acc, r) => acc + (r.permit_count || 0), 0);
  const totalAbsent = reports.reduce((acc, r) => acc + (r.absent_count || 0), 0);
  const avgPercentage = totalStudentsAccum > 0 ? Math.round((totalPresent / totalStudentsAccum) * 100) : 0;

  return res.json({
    reports,
    summary: {
      total_reports: reports.length,
      total_students_accumulated: totalStudentsAccum,
      total_present: totalPresent,
      total_sick: totalSick,
      total_permit: totalPermit,
      total_absent: totalAbsent,
      average_percentage: avgPercentage,
    },
  });
});

// GET /api/admin/audit-logs
router.get('/audit-logs', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const { role, search, limit = 200 } = req.query;

  let logs = [...db.audit_logs];

  if (role) {
    logs = logs.filter((l) => l.role === String(role));
  }

  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.user_name.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
    );
  }

  logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({ logs: logs.slice(0, Number(limit)) });
});

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const safeUsers = db.users.map(({ password: _, ...u }) => {
    let teacherInfo;
    if (u.role === 'guru') {
      const t = db.teachers.find((tc) => tc.user_id === u.id);
      if (t) {
        const cl = t.class_id ? db.classes.find((c) => c.id === t.class_id) : undefined;
        teacherInfo = {
          nip: t.nip,
          class_id: t.class_id,
          class_name: cl?.class_name,
          phone: t.phone,
        };
      }
    }
    return {
      ...u,
      teacher: teacherInfo,
    };
  });

  return res.json({ users: safeUsers });
});

// POST /api/admin/users
router.post('/users', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const adminUser = req.user!;
  const { name, username, email, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'Nama, username, password, dan role wajib diisi.' });
  }

  const db = getDB();
  const cleanUsername = username.trim().toLowerCase();
  const exists = db.users.find((u) => u.username.toLowerCase() === cleanUsername);
  if (exists) {
    return res.status(400).json({ error: `Username ${username} sudah terdaftar.` });
  }

  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: `usr_${Date.now()}_${cleanUsername}`,
    name: name.trim(),
    username: cleanUsername,
    email: email?.trim() || `${cleanUsername}@sdnoehendak.sch.id`,
    password: hashedPassword,
    role: role === 'admin' ? 'admin' : 'guru',
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  db.users.push(newUser);
  saveDB(db);

  logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'TAMBAH_PENGGUNA',
    'users',
    `Admin membuat akun pengguna baru: ${newUser.name} (${newUser.role.toUpperCase()})`,
    newUser.id
  );

  const { password: _, ...userSafe } = newUser;
  return res.status(201).json({ message: 'Pengguna berhasil dibuat.', user: userSafe });
});

// PUT /api/admin/users/:id
router.put('/users/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const adminUser = req.user!;
  const { name, email, status, role, new_password } = req.body;

  const db = getDB();
  const targetUser = db.users.find((u) => u.id === id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  if (name) targetUser.name = name.trim();
  if (email) targetUser.email = email.trim();
  if (status) targetUser.status = status;
  if (role) targetUser.role = role;

  if (new_password && new_password.trim().length >= 6) {
    const salt = bcrypt.genSaltSync(10);
    targetUser.password = bcrypt.hashSync(new_password.trim(), salt);
  }

  targetUser.updated_at = now;
  saveDB(db);

  logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'UBAH_PENGGUNA',
    'users',
    `Admin memperbarui akun pengguna: ${targetUser.name}`,
    targetUser.id
  );

  const { password: _, ...userSafe } = targetUser;
  return res.json({ message: 'Data pengguna berhasil diperbarui.', user: userSafe });
});

export const getSettingsHandler = (req: Request, res: Response) => {
  const db = getDB();
  if (!db.school_settings) {
    db.school_settings = {
      id: 'settings_01',
      school_name: 'UPTD SD NEGERI OEHENDAK',
      npsn: '50302819',
      address: 'Jl. Oehendak No. 12, Kel. Oebufu, Kec. Oebobo, Kota Kupang, NTT',
      phone: '(0380) 821945',
      email: 'sdnoehendak@gmail.com',
      principal_name: 'Drs. Fransiskus Xaverius, M.Pd.',
      principal_nip: '19680512 199303 1 008',
      academic_year: '2026/2027',
      semester: 'Semester Ganjil',
      logo_url: '/school-logo.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveDB(db);
  }
  return res.json({ settings: db.school_settings });
};

export const updateSettingsHandler = (req: AuthRequest, res: Response) => {
  const adminUser = req.user || {
    id: 'usr_admin',
    name: 'Administrator Sekolah',
    role: 'admin' as const,
  };
  const db = getDB();
  const {
    school_name,
    npsn,
    address,
    email,
    phone,
    principal_name,
    principal_nip,
    academic_year,
    semester,
    logo_url,
  } = req.body || {};

  const now = new Date().toISOString();

  if (!db.school_settings) {
    db.school_settings = {
      id: 'settings_01',
      school_name: 'UPTD SD NEGERI OEHENDAK',
      npsn: '50302819',
      address: 'Jl. Oehendak No. 12, Kel. Oebufu, Kec. Oebobo, Kota Kupang, NTT',
      phone: '(0380) 821945',
      email: 'sdnoehendak@gmail.com',
      principal_name: 'Drs. Fransiskus Xaverius, M.Pd.',
      principal_nip: '19680512 199303 1 008',
      academic_year: '2026/2027',
      semester: 'Semester Ganjil',
      logo_url: '/school-logo.png',
      created_at: now,
      updated_at: now,
    };
  }

  if (school_name !== undefined && school_name !== null) db.school_settings.school_name = String(school_name).trim();
  if (npsn !== undefined && npsn !== null) db.school_settings.npsn = String(npsn).trim();
  if (address !== undefined && address !== null) db.school_settings.address = String(address).trim();
  if (email !== undefined && email !== null) db.school_settings.email = String(email).trim();
  if (phone !== undefined && phone !== null) db.school_settings.phone = String(phone).trim();
  if (principal_name !== undefined && principal_name !== null) db.school_settings.principal_name = String(principal_name).trim();
  if (principal_nip !== undefined && principal_nip !== null) db.school_settings.principal_nip = String(principal_nip).trim();
  if (academic_year !== undefined && academic_year !== null) db.school_settings.academic_year = String(academic_year).trim();
  if (semester !== undefined && semester !== null) db.school_settings.semester = String(semester).trim();
  if (logo_url !== undefined && logo_url !== null) db.school_settings.logo_url = String(logo_url).trim();

  db.school_settings.updated_at = now;
  saveDB(db);

  logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'UBAH_PENGATURAN',
    'school_settings',
    `Admin memperbarui informasi identitas sekolah ${db.school_settings.school_name}.`
  );

  return res.json({ message: 'Pengaturan sekolah berhasil diperbarui.', settings: db.school_settings });
};

// GET /api/admin/settings and /settings
router.get('/settings', getSettingsHandler as any);

// PUT /api/admin/settings and /settings (Admin only)
router.put('/settings', authenticate, requireAdmin, updateSettingsHandler as any);

export default router;
