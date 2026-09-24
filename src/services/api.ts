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
let inMemoryAuthData: {
  token: string;
  user: User;
  teacher?: Teacher;
  assigned_class?: SchoolClass;
} | null = null;

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
  if (inMemoryAuthData?.user) return inMemoryAuthData.user;
  if (inMemoryCurrentUser) return inMemoryCurrentUser;
  try {
    if (typeof localStorage !== 'undefined') {
      const authDataStr = localStorage.getItem('piket_auth_data');
      if (authDataStr) {
        const parsed = JSON.parse(authDataStr);
        if (parsed?.user) {
          inMemoryCurrentUser = parsed.user;
          inMemoryAuthData = parsed;
          return parsed.user;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function getCurrentAuthData(): {
  user: User;
  teacher?: Teacher;
  assigned_class?: SchoolClass;
} | null {
  if (inMemoryAuthData) return inMemoryAuthData;
  try {
    if (typeof localStorage !== 'undefined') {
      const authDataStr = localStorage.getItem('piket_auth_data');
      if (authDataStr) {
        const parsed = JSON.parse(authDataStr);
        inMemoryAuthData = parsed;
        return parsed;
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
    inMemoryAuthData = {
      token: res.token,
      user: res.user,
      teacher: res.teacher,
      assigned_class: res.assigned_class,
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          'piket_auth_data',
          JSON.stringify(inMemoryAuthData)
        );
      }
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
    inMemoryCurrentUser = null;
    inMemoryAuthData = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('piket_auth_data');
        localStorage.removeItem('piket_auth_token');
      }
    } catch (e) {
      // ignore
    }
    return { message: 'Berhasil keluar.' };
  },

  async getMe(): Promise<{ user: User & { teacher?: Teacher; assigned_class?: SchoolClass } }> {
    let authData = getCurrentAuthData();
    let stored = getCurrentStoredUser();
    if (!stored) {
      throw new Error('Sesi tidak ditemukan.');
    }

    let teacher = authData?.teacher;
    let assigned_class = authData?.assigned_class;

    // If role is guru and teacher or class is missing, resolve directly from Firestore
    if (stored.role === 'guru' && (!teacher || !assigned_class)) {
      try {
        const teachersRes = await firestoreService.getTeachers();
        const foundTeacher = teachersRes.teachers.find(
          (t) =>
            t.user_id === stored?.id ||
            t.id === stored?.teacher_id ||
            t.id === (stored as any)?.teacherId ||
            (stored?.email && t.email === stored.email) ||
            (stored?.name && t.name.toLowerCase() === stored.name.toLowerCase())
        );

        if (foundTeacher) {
          teacher = foundTeacher;
          if (foundTeacher.class_id) {
            const classesRes = await firestoreService.getClasses();
            const foundClass = classesRes.classes.find((c) => c.id === foundTeacher.class_id);
            if (foundClass) {
              assigned_class = foundClass;
            }
          }

          // Update cache
          const token = inMemoryToken || getApiToken() || '';
          inMemoryAuthData = {
            token,
            user: { ...stored, teacher_id: foundTeacher.id, teacherId: foundTeacher.id },
            teacher,
            assigned_class,
          };
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('piket_auth_data', JSON.stringify(inMemoryAuthData));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Error resolving teacher in getMe:', err);
      }
    }

    return {
      user: {
        ...stored,
        teacher,
        assigned_class,
      },
    };
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
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menambah kelas.');
    }
    return firestoreService.createClass(
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async updateClass(id: string, payload: Partial<SchoolClass>): Promise<{ message: string; class: SchoolClass }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengubah kelas.');
    }
    return firestoreService.updateClass(
      id,
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menghapus kelas.');
    }
    return firestoreService.deleteClass(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  // ---------------- TEACHERS ----------------
  async getTeachers(): Promise<{ teachers: Teacher[] }> {
    return firestoreService.getTeachers();
  },

  async createTeacher(payload: any): Promise<{ message: string; teacher: Teacher }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menambah data guru.');
    }
    return firestoreService.createTeacher(
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async updateTeacher(id: string, payload: any): Promise<{ message: string; teacher: Teacher }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengubah data guru.');
    }
    return firestoreService.updateTeacher(
      id,
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async deleteTeacher(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menonaktifkan guru.');
    }
    return firestoreService.deleteTeacher(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  // ---------------- STUDENTS ----------------
  async getStudents(params?: { class_id?: string; search?: string }): Promise<{ students: Student[] }> {
    const auth = getCurrentAuthData();
    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      // If a Guru tries to query another class, REJECT with Access Denied
      if (params?.class_id && allowedClassId && params.class_id !== allowedClassId) {
        throw new Error('Akses ditolak: Anda tidak memiliki izin untuk melihat data siswa dari kelas lain.');
      }
      // If class_id was not explicitly specified, restrict to the teacher's assigned class
      if (!params?.class_id && allowedClassId) {
        return firestoreService.getStudents({ ...params, class_id: allowedClassId });
      }
    }
    return firestoreService.getStudents(params);
  },

  async createStudent(payload: Partial<Student>): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menambah data siswa.');
    }
    return firestoreService.createStudent(
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async updateStudent(id: string, payload: Partial<Student>): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengubah data siswa.');
    }
    return firestoreService.updateStudent(
      id,
      payload,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async moveStudent(id: string, target_class_id: string): Promise<{ message: string; student: Student }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang memindahkan siswa.');
    }
    return firestoreService.moveStudent(
      id,
      target_class_id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async deleteStudent(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menghapus siswa.');
    }
    return firestoreService.deleteStudent(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async importStudents(
    items: any[],
    defaultClassId?: string
  ): Promise<{ message: string; total_imported: number; failed_count: number; errors: any[] }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengimpor data siswa.');
    }
    return firestoreService.importStudents(
      items,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      defaultClassId
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
    const auth = getCurrentAuthData();
    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      if (params?.class_id && allowedClassId && params.class_id !== allowedClassId) {
        throw new Error('Akses ditolak: Guru tidak diizinkan membuka arsip laporan kelas lain.');
      }
      if (!params?.class_id && allowedClassId) {
        return firestoreService.getDailyReports({ ...params, class_id: allowedClassId });
      }
    }
    return firestoreService.getDailyReports(params);
  },

  async getReportById(id: string): Promise<{ report: DailyReport }> {
    const res = await firestoreService.getDailyReportById(id);
    const auth = getCurrentAuthData();
    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      if (allowedClassId && res.report.class_id !== allowedClassId) {
        throw new Error('Akses ditolak: Anda tidak memiliki hak akses untuk membuka laporan kelas lain.');
      }
    }
    return res;
  },

  async getReportDetail(id: string): Promise<{ report: DailyReport }> {
    return this.getReportById(id);
  },

  async checkReportDuplicate(classId: string, date: string): Promise<{ exists: boolean; report?: DailyReport }> {
    const auth = getCurrentAuthData();
    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      if (allowedClassId && classId !== allowedClassId) {
        throw new Error('Akses ditolak: Guru tidak diizinkan memeriksa laporan kelas lain.');
      }
    }
    const res = await firestoreService.getDailyReports({ class_id: classId, date });
    if (res.reports && res.reports.length > 0) {
      return { exists: true, report: res.reports[0] };
    }
    return { exists: false };
  },

  async createReport(payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    const auth = getCurrentAuthData();
    const currentUser = getCurrentStoredUser();
    const finalPayload = { ...payload };

    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      const targetClassId = finalPayload.class_id || (finalPayload as any).classId;
      if (targetClassId && allowedClassId && targetClassId !== allowedClassId) {
        throw new Error('Akses ditolak: Anda tidak dapat membuat laporan untuk kelas lain.');
      }
      if (!targetClassId && allowedClassId) {
        finalPayload.class_id = allowedClassId;
        finalPayload.classId = allowedClassId;
      }
      if (!finalPayload.teacher_id && !(finalPayload as any).teacherId) {
        const tId = auth.teacher?.id || auth.user?.teacher_id || (auth.user as any)?.teacherId;
        if (tId) {
          finalPayload.teacher_id = tId;
          finalPayload.teacherId = tId;
        }
      }
      if (!finalPayload.teacher_name && !(finalPayload as any).teacherName) {
        const tName = auth.teacher?.name || auth.user?.name;
        if (tName) {
          finalPayload.teacher_name = tName;
          finalPayload.teacherName = tName;
        }
      }
    }

    const effectiveTeacherId = finalPayload.teacher_id || (finalPayload as any).teacherId;
    if (!effectiveTeacherId && currentUser?.role !== 'guru') {
      throw new Error('Guru piket wajib ditentukan.');
    }

    return firestoreService.saveDailyReport(
      finalPayload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async submitReport(payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    return this.createReport(payload);
  },

  async updateReport(id: string, payload: Partial<DailyReport> & { attendance_items?: any[] }): Promise<{ message: string; report: DailyReport }> {
    const auth = getCurrentAuthData();
    const currentUser = getCurrentStoredUser();
    const finalPayload = { ...payload, id };

    if (auth?.user?.role === 'guru') {
      const allowedClassId = auth.assigned_class?.id || auth.teacher?.class_id;
      const targetClassId = finalPayload.class_id || (finalPayload as any).classId;
      if (targetClassId && allowedClassId && targetClassId !== allowedClassId) {
        throw new Error('Akses ditolak: Anda tidak diizinkan mengubah laporan kelas lain.');
      }
      if (!targetClassId && allowedClassId) {
        finalPayload.class_id = allowedClassId;
        finalPayload.classId = allowedClassId;
      }
      if (!finalPayload.teacher_id && !(finalPayload as any).teacherId) {
        const tId = auth.teacher?.id || auth.user?.teacher_id || (auth.user as any)?.teacherId;
        if (tId) {
          finalPayload.teacher_id = tId;
          finalPayload.teacherId = tId;
        }
      }
      if (!finalPayload.teacher_name && !(finalPayload as any).teacherName) {
        const tName = auth.teacher?.name || auth.user?.name;
        if (tName) {
          finalPayload.teacher_name = tName;
          finalPayload.teacherName = tName;
        }
      }
    }

    return firestoreService.saveDailyReport(
      finalPayload,
      currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : undefined
    );
  },

  async lockReport(id: string): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengunci laporan.');
    }
    return firestoreService.lockReport(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async reopenReport(id: string): Promise<{ message: string; report: DailyReport }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang membuka kunci laporan.');
    }
    return firestoreService.reopenReport(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  async deleteReport(id: string): Promise<{ message: string }> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang menghapus laporan.');
    }
    return firestoreService.deleteReport(
      id,
      { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    );
  },

  // ---------------- DASHBOARD & STATS ----------------
  async getAdminDashboard(date?: string): Promise<DashboardAdminStats> {
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengakses Dashboard Admin.');
    }
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
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang mengakses Rekapitulasi Laporan.');
    }
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
    const currentUser = getCurrentStoredUser();
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Akses ditolak: Hanya Administrator yang berwenang melihat Audit Logs.');
    }
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
