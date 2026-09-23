import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Teacher,
  SchoolClass,
  Student,
  DailyReport,
  AttendanceRecord,
  AuditLog,
  SchoolSettings,
  AttendanceStatus,
} from '../src/types';

export interface DatabaseSchema {
  users: User[];
  teachers: Teacher[];
  classes: SchoolClass[];
  students: Student[];
  daily_reports: DailyReport[];
  attendance: AttendanceRecord[];
  audit_logs: AuditLog[];
  school_settings: SchoolSettings;
}

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'piket_database.json');

// Ensure data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[DB] Warning creating data directory:', err);
  }
}
ensureDataDir();

let dbCache: DatabaseSchema | null = null;

function getIndonesianDayName(dateStr: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const d = new Date(dateStr + 'T00:00:00Z');
  return days[d.getUTCDay()] || 'Senin';
}

function getInitialDatabase(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const guruHash = bcrypt.hashSync('guru123', salt);

  const now = new Date().toISOString();

  const settings: SchoolSettings = {
    id: 'settings_01',
    school_name: 'UPTD SD NEGERI OEHENDAK',
    npsn: '50302819',
    address: 'Jl. Oehendak No. 12, Kel. Oebufu, Kec. Oebobo, Kota Kupang, NTT',
    email: 'sdn_oehendak@pendidikan.go.id',
    phone: '(0380) 821945',
    principal_name: 'Dra. Maria Yovita Bano, M.Pd',
    principal_nip: '19680512 199303 2 004',
    logo_url: '/school-logo.png',
    academic_year: '2026/2027',
    semester: 'Ganjil',
    created_at: now,
    updated_at: now,
  };

  const users: User[] = [
    {
      id: 'usr_admin',
      name: 'Administrator Sekolah',
      username: 'admin',
      email: 'admin@sdnoehendak.sch.id',
      password: adminHash,
      role: 'admin',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_guru1',
      name: "Noni Retman Nenot'ek, S.Pd",
      username: 'guru1',
      email: 'noni.nenotek@sdnoehendak.sch.id',
      password: guruHash,
      role: 'guru',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_guru2',
      name: 'Maria Magdalena, S.Pd',
      username: 'guru2',
      email: 'maria.magdalena@sdnoehendak.sch.id',
      password: guruHash,
      role: 'guru',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_guru3',
      name: 'Yohanes Bria, S.Pd',
      username: 'guru3',
      email: 'yohanes.bria@sdnoehendak.sch.id',
      password: guruHash,
      role: 'guru',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_guru4',
      name: 'Agustina Riwu, S.Pd.SD',
      username: 'guru4',
      email: 'agustina.riwu@sdnoehendak.sch.id',
      password: guruHash,
      role: 'guru',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'usr_guru5',
      name: 'Petrus Talan, S.Pd',
      username: 'guru5',
      email: 'petrus.talan@sdnoehendak.sch.id',
      password: guruHash,
      role: 'guru',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ];

  const classNames = [
    { name: 'I A', grade: 1 },
    { name: 'I B', grade: 1 },
    { name: 'II A', grade: 2 },
    { name: 'II B', grade: 2 },
    { name: 'III A', grade: 3 },
    { name: 'III B', grade: 3 },
    { name: 'IV A', grade: 4 },
    { name: 'IV B', grade: 4 },
    { name: 'V A', grade: 5 },
    { name: 'V B', grade: 5 },
    { name: 'VI A', grade: 6 },
    { name: 'VI B', grade: 6 },
  ];

  const classes: SchoolClass[] = classNames.map((c, idx) => ({
    id: `cls_${c.name.replace(/\s+/g, '_').toLowerCase()}`,
    class_name: c.name,
    grade: c.grade,
    academic_year: '2026/2027',
    status: 'active',
    created_at: now,
    updated_at: now,
  }));

  // Assign teachers
  // guru1 -> V B
  // guru2 -> I A
  // guru3 -> VI A
  // guru4 -> III A
  // guru5 -> IV B
  const teachers: Teacher[] = [
    {
      id: 'tch_01',
      user_id: 'usr_guru1',
      nip: '19820415 200801 2 018',
      name: "Noni Retman Nenot'ek, S.Pd",
      class_id: 'cls_v_b',
      phone: '081234567891',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tch_02',
      user_id: 'usr_guru2',
      nip: '19850620 201001 2 021',
      name: 'Maria Magdalena, S.Pd',
      class_id: 'cls_i_a',
      phone: '081234567892',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tch_03',
      user_id: 'usr_guru3',
      nip: '19800110 200604 1 009',
      name: 'Yohanes Bria, S.Pd',
      class_id: 'cls_vi_a',
      phone: '081234567893',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tch_04',
      user_id: 'usr_guru4',
      nip: '19881105 201202 2 015',
      name: 'Agustina Riwu, S.Pd.SD',
      class_id: 'cls_iii_a',
      phone: '081234567894',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
    {
      id: 'tch_05',
      user_id: 'usr_guru5',
      nip: '19830722 200903 1 012',
      name: 'Petrus Talan, S.Pd',
      class_id: 'cls_iv_b',
      phone: '081234567895',
      status: 'active',
      created_at: now,
      updated_at: now,
    },
  ];

  // Link class teacher_id
  classes.forEach((cl) => {
    const matched = teachers.find((t) => t.class_id === cl.id);
    if (matched) {
      cl.teacher_id = matched.id;
      cl.teacher_name = matched.name;
    }
  });

  // Seed Students (at least 10-12 students per class)
  const students: Student[] = [];
  const sampleFirstNames = [
    { name: 'Andi', gender: 'L' },
    { name: 'Budi', gender: 'L' },
    { name: 'Citra', gender: 'P' },
    { name: 'Daniel', gender: 'L' },
    { name: 'Elisabeth', gender: 'P' },
    { name: 'Fransiskus', gender: 'L' },
    { name: 'Gracia', gender: 'P' },
    { name: 'Hendra', gender: 'L' },
    { name: 'Intan', gender: 'P' },
    { name: 'Jonathan', gender: 'L' },
    { name: 'Keisha', gender: 'P' },
    { name: 'Lucas', gender: 'L' },
  ] as const;

  const lastNames = [
    'Pratama',
    'Santoso',
    'Lestari',
    'Fernandez',
    'Rambu',
    'Xaverius',
    'Putri',
    'Wijaya',
    'Permata',
    'Kase',
    'Amelia',
    'Manafe',
  ];

  classes.forEach((cls, cIdx) => {
    sampleFirstNames.forEach((s, sIdx) => {
      const nisNum = 1000 + cIdx * 50 + sIdx + 1;
      const nisnNum = 3000000000 + cIdx * 50 + sIdx + 1;
      students.push({
        id: `std_${cls.id}_${sIdx + 1}`,
        nis: String(nisNum),
        nisn: String(nisnNum),
        name: `${s.name} ${lastNames[sIdx % lastNames.length]}`,
        gender: s.gender as 'L' | 'P',
        class_id: cls.id,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
    });
  });

  // Pre-seed daily reports for yesterday and some history
  const daily_reports: DailyReport[] = [];
  const attendance: AttendanceRecord[] = [];

  // Yesterday date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Report for V B yesterday
  const vbStudents = students.filter((s) => s.class_id === 'cls_v_b');
  const repVbId = `rep_${yesterdayStr}_cls_v_b`;
  
  daily_reports.push({
    id: repVbId,
    date: yesterdayStr,
    day_name: getIndonesianDayName(yesterdayStr),
    class_id: 'cls_v_b',
    class_name: 'V B',
    teacher_id: 'tch_01',
    teacher_name: "Noni Retman Nenot'ek, S.Pd",
    semester: 'Ganjil',
    academic_year: '2026/2027',
    cleanliness_status: 'Sangat Baik',
    activity_notes: [
      'Menyapu kelas',
      'Membersihkan papan tulis',
      'Merapikan meja dan kursi',
      'Membuang sampah',
    ],
    incident_notes: 'Tidak ada kejadian khusus. Siswa mengikuti pembelajaran dengan tertib.',
    follow_up: 'Melanjutkan pengawasan kebersihan di jam istirahat.',
    status: 'locked',
    total_students: vbStudents.length,
    present_count: vbStudents.length - 2,
    sick_count: 1,
    permit_count: 1,
    absent_count: 0,
    attendance_percentage: Math.round(((vbStudents.length - 2) / vbStudents.length) * 100),
    submitted_at: `${yesterdayStr}T07:45:00Z`,
    updated_at: `${yesterdayStr}T07:45:00Z`,
    locked_at: `${yesterdayStr}T14:00:00Z`,
    locked_by: 'usr_admin',
  });

  vbStudents.forEach((st, idx) => {
    let stat: AttendanceStatus = 'H';
    let note = '';
    if (idx === 1) {
      stat = 'S';
      note = 'Demam dan flu';
    } else if (idx === 2) {
      stat = 'I';
      note = 'Acara keluarga';
    }
    attendance.push({
      id: `att_${repVbId}_${st.id}`,
      report_id: repVbId,
      student_id: st.id,
      student_name: st.name,
      student_nis: st.nis,
      student_nisn: st.nisn,
      student_gender: st.gender,
      status: stat,
      note,
    });
  });

  // Report for I A yesterday
  const iaStudents = students.filter((s) => s.class_id === 'cls_i_a');
  const repIaId = `rep_${yesterdayStr}_cls_i_a`;
  daily_reports.push({
    id: repIaId,
    date: yesterdayStr,
    day_name: getIndonesianDayName(yesterdayStr),
    class_id: 'cls_i_a',
    class_name: 'I A',
    teacher_id: 'tch_02',
    teacher_name: 'Maria Magdalena, S.Pd',
    semester: 'Ganjil',
    academic_year: '2026/2027',
    cleanliness_status: 'Baik',
    activity_notes: ['Menyapu kelas', 'Merapikan meja dan kursi'],
    incident_notes: 'Tidak ada kejadian khusus.',
    follow_up: 'Pengawasan baris-berbaris sebelum masuk kelas.',
    status: 'locked',
    total_students: iaStudents.length,
    present_count: iaStudents.length - 1,
    sick_count: 1,
    permit_count: 0,
    absent_count: 0,
    attendance_percentage: Math.round(((iaStudents.length - 1) / iaStudents.length) * 100),
    submitted_at: `${yesterdayStr}T07:50:00Z`,
    updated_at: `${yesterdayStr}T07:50:00Z`,
    locked_at: `${yesterdayStr}T14:00:00Z`,
    locked_by: 'usr_admin',
  });

  iaStudents.forEach((st, idx) => {
    let stat: AttendanceStatus = 'H';
    let note = '';
    if (idx === 0) {
      stat = 'S';
      note = 'Sakit batuk';
    }
    attendance.push({
      id: `att_${repIaId}_${st.id}`,
      report_id: repIaId,
      student_id: st.id,
      student_name: st.name,
      student_nis: st.nis,
      student_nisn: st.nisn,
      student_gender: st.gender,
      status: stat,
      note,
    });
  });

  const audit_logs: AuditLog[] = [
    {
      id: 'log_01',
      user_id: 'usr_admin',
      user_name: 'Administrator Sekolah',
      role: 'admin',
      action: 'SISTEM_INISIALISASI',
      table_name: 'users',
      description: 'Sistem laporan piket harian sekolah dasar diinisialisasi.',
      created_at: now,
    },
    {
      id: 'log_02',
      user_id: 'usr_guru1',
      user_name: "Noni Retman Nenot'ek, S.Pd",
      role: 'guru',
      action: 'KIRIM_LAPORAN',
      table_name: 'daily_reports',
      record_id: repVbId,
      description: `Guru mengirim laporan piket harian untuk kelas V B tanggal ${yesterdayStr}`,
      created_at: `${yesterdayStr}T07:45:00Z`,
    },
    {
      id: 'log_03',
      user_id: 'usr_admin',
      user_name: 'Administrator Sekolah',
      role: 'admin',
      action: 'KUNCI_LAPORAN',
      table_name: 'daily_reports',
      record_id: repVbId,
      description: `Admin mengunci laporan kelas V B tanggal ${yesterdayStr}`,
      created_at: `${yesterdayStr}T14:00:00Z`,
    },
  ];

  return {
    users,
    teachers,
    classes,
    students,
    daily_reports,
    attendance,
    audit_logs,
    school_settings: settings,
  };
}

// Load DB from file with cache
export function getDB(): DatabaseSchema {
  if (dbCache) {
    return dbCache;
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(data);
      if (dbCache?.school_settings && (!dbCache.school_settings.logo_url || dbCache.school_settings.logo_url === '/icon.svg')) {
        dbCache.school_settings.logo_url = '/school-logo.png';
      }
      return dbCache!;
    } catch (err) {
      console.error('Error reading database file, re-initializing...', err);
    }
  }

  // Check fallback repository data directory if on Vercel/container
  const repoDataFile = path.join(process.cwd(), 'data', 'piket_database.json');
  if (repoDataFile !== DB_FILE && fs.existsSync(repoDataFile)) {
    try {
      const data = fs.readFileSync(repoDataFile, 'utf-8');
      dbCache = JSON.parse(data);
      saveDB(dbCache!);
      return dbCache!;
    } catch (err) {
      console.warn('[DB] Could not load fallback repo database file:', err);
    }
  }

  // Generate initial database
  const initial = getInitialDatabase();
  saveDB(initial);
  return initial;
}

// Save DB atomically
export function saveDB(data: DatabaseSchema): void {
  dbCache = data;
  try {
    ensureDataDir();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn('[DB] Warning saving database to disk (in-memory state preserved):', err);
  }
}

// Helper: Add Audit Log
export function logAudit(
  userId: string,
  userName: string,
  role: 'admin' | 'guru',
  action: string,
  tableName: string,
  description: string,
  recordId?: string
): void {
  const db = getDB();
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    user_name: userName,
    role,
    action,
    table_name: tableName,
    record_id: recordId,
    description,
    created_at: new Date().toISOString(),
  };
  db.audit_logs.unshift(newLog);
  // Keep last 1000 logs
  if (db.audit_logs.length > 1000) {
    db.audit_logs = db.audit_logs.slice(0, 1000);
  }
  saveDB(db);
}
