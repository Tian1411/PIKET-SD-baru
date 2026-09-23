import { Router, Response } from 'express';
import { getDB, saveDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';
import { SchoolClass } from '../../src/types';

const router = Router();

// GET /api/classes
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const classes = db.classes.filter((c) => c.status === 'active');

  // Enrich with teacher info and student count
  const enriched = classes.map((c) => {
    const teacher = db.teachers.find((t) => t.class_id === c.id && t.status === 'active');
    const studentCount = db.students.filter((s) => s.class_id === c.id && s.status === 'active').length;

    return {
      ...c,
      teacher_id: teacher?.id,
      teacher_name: teacher?.name || 'Belum Ditugaskan',
      total_students: studentCount,
    };
  });

  // Sort by grade, then class_name
  enriched.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.class_name.localeCompare(b.class_name);
  });

  return res.json({ classes: enriched });
});

// POST /api/classes (Admin only)
router.post(['/', ''], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  let { class_name, grade, academic_year, teacher_id } = req.body || {};

  if (!class_name || !String(class_name).trim()) {
    return res.status(400).json({ error: 'Nama kelas wajib diisi (contoh: I A, II B, VII).' });
  }

  const rawName = String(class_name).trim();
  const cleanName = rawName.replace(/^kelas\s+/i, '').trim();

  let parsedGrade = Number(grade);
  if (isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 6) {
    const match = cleanName.match(/^(vi|iv|v|iii|ii|i|[1-6])/i);
    if (match) {
      const gStr = match[1].toUpperCase();
      const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
      parsedGrade = romanMap[gStr] || parseInt(gStr, 10) || 1;
    } else {
      parsedGrade = 1;
    }
  }

  const db = getDB();
  const now = new Date().toISOString();

  // Check if active class with same name exists
  const existingActive = db.classes.find(
    (c) => c.class_name.toLowerCase() === cleanName.toLowerCase() && c.status === 'active'
  );

  if (existingActive) {
    // If teacher_id is provided, gracefully update the assignment
    if (teacher_id !== undefined) {
      if (teacher_id) {
        const teacher = db.teachers.find((t) => t.id === teacher_id);
        if (teacher) {
          // Release other teacher assigned to this class
          const prevTeacher = db.teachers.find((t) => t.class_id === existingActive.id && t.id !== teacher.id);
          if (prevTeacher) {
            prevTeacher.class_id = undefined;
            prevTeacher.updated_at = now;
          }
          // Release previous class of this teacher
          if (teacher.class_id && teacher.class_id !== existingActive.id) {
            const oldClass = db.classes.find((c) => c.id === teacher.class_id);
            if (oldClass) {
              oldClass.teacher_id = undefined;
              oldClass.teacher_name = undefined;
              oldClass.updated_at = now;
            }
          }
          teacher.class_id = existingActive.id;
          teacher.updated_at = now;
          existingActive.teacher_id = teacher.id;
          existingActive.teacher_name = teacher.name;
        }
      }
      existingActive.grade = parsedGrade;
      if (academic_year) existingActive.academic_year = String(academic_year).trim();
      existingActive.updated_at = now;
      saveDB(db);

      return res.status(200).json({
        message: `Kelas ${cleanName} sudah ada dan datanya berhasil diperbarui.`,
        class: existingActive,
      });
    }

    return res.status(400).json({
      error: `Kelas "${cleanName}" sudah terdaftar (Tingkat ${existingActive.grade}). Silakan gunakan tombol edit pada tabel untuk mengubah data kelas ini.`,
    });
  }

  // Check if inactive class exists - reactivate it
  const existingInactive = db.classes.find(
    (c) => c.class_name.toLowerCase() === cleanName.toLowerCase() && c.status === 'inactive'
  );

  let newClass: SchoolClass;
  if (existingInactive) {
    existingInactive.status = 'active';
    existingInactive.grade = parsedGrade;
    existingInactive.academic_year = academic_year?.trim() || db.school_settings.academic_year || '2026/2027';
    existingInactive.updated_at = now;
    newClass = existingInactive;
  } else {
    const newClassId = `cls_${Date.now()}_${cleanName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    newClass = {
      id: newClassId,
      class_name: cleanName,
      grade: parsedGrade,
      academic_year: academic_year?.trim() || db.school_settings.academic_year || '2026/2027',
      teacher_id: teacher_id || undefined,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    db.classes.push(newClass);
  }

  if (teacher_id) {
    const teacher = db.teachers.find((t) => t.id === teacher_id);
    if (teacher) {
      // Release previous class of this teacher
      if (teacher.class_id && teacher.class_id !== newClass.id) {
        const oldClass = db.classes.find((c) => c.id === teacher.class_id);
        if (oldClass) {
          oldClass.teacher_id = undefined;
          oldClass.teacher_name = undefined;
          oldClass.updated_at = now;
        }
      }
      // Release other teacher assigned to newClass
      const prevTeacher = db.teachers.find((t) => t.class_id === newClass.id && t.id !== teacher.id);
      if (prevTeacher) {
        prevTeacher.class_id = undefined;
        prevTeacher.updated_at = now;
      }
      teacher.class_id = newClass.id;
      teacher.updated_at = now;
      newClass.teacher_name = teacher.name;
    }
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'TAMBAH_KELAS',
    'classes',
    `Admin menambahkan kelas baru: ${newClass.class_name}`,
    newClass.id
  );

  return res.status(201).json({ message: 'Kelas berhasil ditambahkan.', class: newClass });
});

// PUT /api/classes/:id (Admin only)
router.put(['/:id', '/:id/'], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  const { class_name, grade, academic_year, teacher_id } = req.body || {};

  const db = getDB();
  const targetClass = db.classes.find((c) => c.id === id);

  if (!targetClass) {
    return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
  }

  const now = new Date().toISOString();

  if (class_name) targetClass.class_name = String(class_name).replace(/^kelas\s+/i, '').trim();
  if (grade !== undefined && !isNaN(Number(grade))) targetClass.grade = Number(grade);
  if (academic_year) targetClass.academic_year = String(academic_year).trim();

  // If assigning/changing teacher
  if (teacher_id !== undefined) {
    // Detach old teacher if any
    const oldTeacher = db.teachers.find((t) => t.class_id === targetClass.id);
    if (oldTeacher && oldTeacher.id !== teacher_id) {
      oldTeacher.class_id = undefined;
      oldTeacher.updated_at = now;
    }

    if (teacher_id) {
      const newTeacher = db.teachers.find((t) => t.id === teacher_id);
      if (newTeacher) {
        // Release previous class of newTeacher
        if (newTeacher.class_id && newTeacher.class_id !== targetClass.id) {
          const oldClass = db.classes.find((c) => c.id === newTeacher.class_id);
          if (oldClass) {
            oldClass.teacher_id = undefined;
            oldClass.teacher_name = undefined;
            oldClass.updated_at = now;
          }
        }
        newTeacher.class_id = targetClass.id;
        newTeacher.updated_at = now;
        targetClass.teacher_id = newTeacher.id;
        targetClass.teacher_name = newTeacher.name;
      }
    } else {
      targetClass.teacher_id = undefined;
      targetClass.teacher_name = undefined;
    }
  }

  targetClass.updated_at = now;
  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'UBAH_KELAS',
    'classes',
    `Admin memperbarui data kelas ${targetClass.class_name}`,
    targetClass.id
  );

  return res.json({ message: 'Data kelas berhasil diperbarui.', class: targetClass });
});

// DELETE /api/classes/:id (Admin only - soft delete)
router.delete(['/:id', '/:id/'], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  const db = getDB();
  const targetClass = db.classes.find((c) => c.id === id);

  if (!targetClass) {
    return res.status(404).json({ error: 'Kelas tidak ditemukan.' });
  }

  targetClass.status = 'inactive';
  targetClass.updated_at = new Date().toISOString();

  // Release teacher assignment
  const teacher = db.teachers.find((t) => t.class_id === id);
  if (teacher) {
    teacher.class_id = undefined;
    teacher.updated_at = new Date().toISOString();
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'NONAKTIFKAN_KELAS',
    'classes',
    `Admin menonaktifkan kelas ${targetClass.class_name}`,
    targetClass.id
  );

  return res.json({ message: 'Kelas berhasil dinonaktifkan.' });
});

export default router;
