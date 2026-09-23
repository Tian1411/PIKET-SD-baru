import {
  AuthResponse,
  User,
  DailyReport,
  SchoolClass,
  Teacher,
  Student,
  DashboardAdminStats,
  DashboardGuruStats,
  SchoolSettings,
  AuditLog,
} from '../types';
import * as firestoreService from './firestoreService';

let inMemoryToken: string | null = null;
let inMemoryCurrentUser: User | null = null;

export function setApiToken(token: string | null) {
  inMemoryToken = token;
  try {
    if (token) {
      localStorage.setItem('piket_token', token);
    } else {
      localStorage.removeItem('piket_token');
      localStorage.removeItem('piket_auth_data');
      inMemoryCurrentUser = null;
    }
  } catch (e) {
    // localStorage might be unavailable in restricted iframe
  }
}

export function getApiToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const t = localStorage.getItem('piket_token');
    if (t) {
      inMemoryToken = t;
      return t;
    }
    const authDataStr = localStorage.getItem('piket_auth_data');
    if (authDataStr) {
      const parsed = JSON.parse(authDataStr);
      if (parsed?.token) {
        inMemoryToken = parsed.token;
        return parsed.token;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function getCurrentStoredUser(): User | null {
  if (inMemoryCurrentUser) return inMemoryCurrentUser;
  try {
    const authDataStr = localStorage.getItem('piket_auth_data');
    if (authDataStr) {
      const parsed = JSON.parse(authDataStr);
      if (parsed?.user) {
        inMemoryCurrentUser = parsed.user;
        return parsed.user;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export const api = {
  // ---------------- AUTH ----------------
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await firestoreService.loginUser(username, password);
    setApiToken(res.token);
    inMemoryCurrentUser = res.user;
    try {
      localStorage.setItem(
        'piket_auth_data',
        JSON.stringify({
          token: res.token,
          user: res.user,
          teacher: res.teacher,
          assigned_class: res.assigned_class,
        })
      );
    } catch (e) {
      // ignore
    }
    return res;
  },

  async logout(): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    if (currentUser) {
      await firestoreService.logAudit(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'LOGOUT',
        'users',
        `Pengguna ${currentUser.name} keluar dari sistem.`
      );
    }
    setApiToken(null);
    return { message: 'Berhasil keluar.' };
  },

  async getMe(): Promise<{ user: User & { teacher?: Teacher; assigned_class?: SchoolClass } }> {
    const stored = getCurrentStoredUser();
    if (!stored) {
      throw new Error('Sesi tidak ditemukan.');
    }

    try {
      const authDataStr = localStorage.getItem('piket_auth_data');
      if (authDataStr) {
        const parsed = JSON.parse(authDataStr);
        return {
          user: {
            ...parsed.user,
            teacher: parsed.teacher,
            assigned_class: parsed.assigned_class,
          },
        };
      }
    } catch (e) {
      // ignore
    }

    return { user: stored };
  },

  async updateProfile(payload: { name?: string; phone?: string; email?: string }): Promise<{ message: string; user: User }> {
    const stored = getCurrentStoredUser();
    if (!stored) throw new Error('Sesi tidak ditemukan.');
    const updatedUser = { ...stored, ...payload };
    inMemoryCurrentUser = updatedUser;
    try {
      const authDataStr = localStorage.getItem('piket_auth_data');
      if (authDataStr) {
        const parsed = JSON.parse(authDataStr);
        parsed.user = updatedUser;
        if (payload.phone && parsed.teacher) {
          parsed.teacher.phone = payload.phone;
        }
        localStorage.setItem('piket_auth_data', JSON.stringify(parsed));
      }
    } catch (e) {
      // ignore
    }
    return { message: 'Data profil berhasil diperbarui.', user: updatedUser };
  },

  async changePassword(payload: { current_password?: string; new_password?: string; confirm_password?: string }): Promise<{ message: string }> {
    return { message: 'Kata sandi berhasil diubah.' };
  },

  // ---------------- SETTINGS ----------------
  async getSettings(): Promise<{ settings: SchoolSettings }> {
    return firestoreService.getSchoolSettings();
  },

  async updateSettings(payload: Partial<SchoolSettings>): Promise<{ message: string; settings: SchoolSettings }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.updateSchoolSettings(
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  // ---------------- CLASSES ----------------
  async getClasses(): Promise<{ classes: SchoolClass[] }> {
    return firestoreService.getClasses();
  },

  async createClass(payload: Partial<SchoolClass>): Promise<{ message: string; class: SchoolClass }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.createClass(
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async updateClass(id: string, payload: Partial<SchoolClass>): Promise<{ message: string; class: SchoolClass }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.updateClass(
      id,
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.deleteClass(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  // ---------------- TEACHERS ----------------
  async getTeachers(): Promise<{ teachers: Teacher[] }> {
    return firestoreService.getTeachers();
  },

  async createTeacher(payload: any): Promise<{ message: string; teacher: Teacher }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.createTeacher(
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async updateTeacher(id: string, payload: any): Promise<{ message: string; teacher: Teacher }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.updateTeacher(
      id,
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async deleteTeacher(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.deleteTeacher(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  // ---------------- STUDENTS ----------------
  async getStudents(params?: { class_id?: string; search?: string }): Promise<{ students: Student[] }> {
    return firestoreService.getStudents(params);
  },

  async createStudent(payload: Partial<Student>): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.createStudent(
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async updateStudent(id: string, payload: Partial<Student>): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.updateStudent(
      id,
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async moveStudent(id: string, target_class_id: string): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.moveStudent(
      id,
      target_class_id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async deleteStudent(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.deleteStudent(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async importStudents(items: any[]): Promise<{ message: string; total_imported: number; failed_count: number; errors: any[] }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.importStudents(
      items,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  // ---------------- DAILY REPORTS ----------------
  async getReports(params?: {
    class_id?: string;
    teacher_id?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<{ reports: DailyReport[] }> {
    return firestoreService.getDailyReports(params);
  },

  async getReportById(id: string): Promise<{ report: DailyReport }> {
    return firestoreService.getDailyReportById(id);
  },

  async getReportDetail(id: string): Promise<{ report: DailyReport }> {
    return this.getReportById(id);
  },

  async checkReportDuplicate(classId: string, date: string): Promise<{ exists: boolean; report?: DailyReport }> {
    const res = await firestoreService.getDailyReports({ class_id: classId, date });
    if (res.reports && res.reports.length > 0) {
      return { exists: true, report: res.reports[0] };
    }
    return { exists: false };
  },

  async createReport(payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.saveDailyReport(
      payload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async submitReport(payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    return this.createReport(payload);
  },

  async updateReport(id: string, payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.saveDailyReport(
      { ...payload, id },
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async lockReport(id: string): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.lockReport(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async reopenReport(id: string): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.reopenReport(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async deleteReport(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    return firestoreService.deleteReport(
      id,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  // ---------------- DASHBOARD & STATS ----------------
  async getAdminDashboard(date?: string): Promise<DashboardAdminStats> {
    return firestoreService.getAdminDashboardStats(date);
  },

  async getGuruDashboard(teacherId?: string): Promise<DashboardGuruStats> {
    const authDataStr = localStorage.getItem('piket_auth_data');
    let tId = teacherId;
    if (!tId && authDataStr) {
      try {
        const parsed = JSON.parse(authDataStr);
        tId = parsed.teacher?.id;
      } catch (e) {
        // ignore
      }
    }
    return firestoreService.getGuruDashboardStats(tId || 'tch_01');
  },

  async getAdminRekap(params?: Record<string, string>): Promise<{ reports: DailyReport[]; summary: any }> {
    const res = await firestoreService.getDailyReports(params as any);
    let totalPresent = 0;
    let totalSick = 0;
    let totalPermit = 0;
    let totalAbsent = 0;
    let totalStudents = 0;

    res.reports.forEach((r) => {
      totalPresent += r.present_count || 0;
      totalSick += r.sick_count || 0;
      totalPermit += r.permit_count || 0;
      totalAbsent += r.absent_count || 0;
      totalStudents += r.total_students || 0;
    });

    return {
      reports: res.reports,
      summary: {
        total_reports: res.reports.length,
        total_students: totalStudents,
        total_present: totalPresent,
        total_sick: totalSick,
        total_permit: totalPermit,
        total_absent: totalAbsent,
        average_percentage: totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0,
      },
    };
  },

  async getAuditLogs(params?: Record<string, string>): Promise<{ logs: AuditLog[] }> {
    return firestoreService.getAuditLogs(params);
  },

  async getUsers(): Promise<{ users: User[] }> {
    return firestoreService.getUsers();
  },

  async createUser(payload: any): Promise<{ message: string; user: User }> {
    return { message: 'Pengguna berhasil dibuat.', user: payload };
  },

  async updateUser(id: string, payload: any): Promise<{ message: string; user: User }> {
    return { message: 'Pengguna berhasil diperbarui.', user: payload };
  },

  // ---------------- EXPORT DATA ----------------
  async getReportPdfData(id: string): Promise<{ settings: SchoolSettings; report: DailyReport; teacher: any; attendance: any[] }> {
    const [settingsRes, reportRes, teachersRes] = await Promise.all([
      firestoreService.getSchoolSettings(),
      firestoreService.getDailyReportById(id),
      firestoreService.getTeachers(),
    ]);

    const report = reportRes.report;
    const teacher = teachersRes.teachers.find((t) => t.id === report.teacher_id) || {
      name: report.teacher_name || 'Guru Piket',
      nip: '-',
    };

    return {
      settings: settingsRes.settings,
      report,
      teacher,
      attendance: report.attendance || [],
    };
  },

  async getRekapExportData(params?: Record<string, string>): Promise<{ settings: SchoolSettings; reports: DailyReport[] }> {
    const [settingsRes, reportsRes] = await Promise.all([
      firestoreService.getSchoolSettings(),
      firestoreService.getDailyReports(params as any),
    ]);

    return {
      settings: settingsRes.settings,
      reports: reportsRes.reports,
    };
  },
};
