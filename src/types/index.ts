export type UserRole = 'admin' | 'guru';
export type UserStatus = 'active' | 'inactive';
export type AttendanceStatus = 'H' | 'S' | 'I' | 'A';
export type ReportStatus = 'draft' | 'submitted' | 'locked' | 'reopened';
export type CleanlinessStatus = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perhatian';
export type Gender = 'L' | 'P';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  nip: string;
  name: string;
  class_id?: string;
  class_name?: string;
  phone?: string;
  email?: string;
  username?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface SchoolClass {
  id: string;
  class_name: string;
  grade: number;
  academic_year: string;
  teacher_id?: string;
  teacher_name?: string;
  total_students?: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: Gender;
  class_id: string;
  class_name?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  report_id: string;
  student_id: string;
  student_name?: string;
  student_nis?: string;
  student_nisn?: string;
  student_gender?: Gender;
  status: AttendanceStatus;
  note?: string;
}

export interface DailyReport {
  id: string;
  date: string; // YYYY-MM-DD
  day_name: string; // Senin, Selasa, dll
  class_id: string;
  class_name?: string;
  teacher_id: string;
  teacher_name?: string;
  semester: string; // 'Ganjil' | 'Genap'
  academic_year: string; // '2026/2027'
  cleanliness_status: CleanlinessStatus;
  activity_notes: string[]; // ['Menyapu kelas', 'Membersihkan papan tulis', ...]
  incident_notes: string;
  follow_up: string;
  status: ReportStatus;
  total_students: number;
  present_count: number; // H
  sick_count: number; // S
  permit_count: number; // I
  absent_count: number; // A
  attendance_percentage?: number;
  submitted_at?: string;
  updated_at: string;
  locked_at?: string;
  locked_by?: string;
  attendance?: AttendanceRecord[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  action: string;
  table_name: string;
  record_id?: string;
  description: string;
  created_at: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  npsn: string;
  address: string;
  email: string;
  phone: string;
  principal_name: string;
  principal_nip: string;
  logo_url: string;
  academic_year: string;
  semester: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  teacher?: Teacher;
  assigned_class?: SchoolClass;
}

export interface DashboardAdminStats {
  total_classes: number;
  total_students: number;
  active_teachers: number;
  reports_today: number;
  today_present: number;
  today_sick: number;
  today_permit: number;
  today_absent: number;
  today_not_filled_classes: number;
  today_status_list: {
    class_id: string;
    class_name: string;
    teacher_name: string;
    total_students: number;
    present: number;
    sick: number;
    permit: number;
    absent: number;
    status: 'Sudah Diisi' | 'Belum Lengkap' | 'Belum Diisi';
    report_status?: ReportStatus;
    report_id?: string;
    submitted_at?: string;
  }[];
}

export interface DashboardGuruStats {
  teacher: Teacher;
  assigned_class: SchoolClass;
  today_date_display: string;
  today_report?: DailyReport;
  recent_reports: DailyReport[];
  summary: {
    total_students: number;
    present: number;
    sick: number;
    permit: number;
    absent: number;
    is_submitted: boolean;
    status: ReportStatus;
  };
}
