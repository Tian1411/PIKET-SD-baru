import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDB, saveDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';
import { Teacher, User } from '../../src/types';

const router = Router();

// GET /api/teachers
router.get(['/', ''], authenticate, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const teachers = db.teachers.filter((t) => t.status === 'active');

  const enriched = teachers.map((t) => {
    const assignedClass = t.class_id ? db.classes.find((c) => c.id === t.class_id) : undefined;
    const user = db.users.find((u) => u.id === t.user_id);
    return {
      ...t,
      class_name: assignedClass?.class_name,
      username: user?.username,
      email: user?.email,
    };
  });

  enriched.sort((a, b) => a.name.localeCompare(b.name));

  return res.json({ teachers: enriched });
});

// POST /api/teachers (Admin only)
router.post(['/', ''], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  let { name, nip, phone, email, username, password, class_id } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Nama guru wajib diisi.' });
  }

  const cleanName = String(name).trim();
  const db = getDB();

  // Clean & generate username safely
  let rawUser = String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');

  if (!rawUser) {
    const firstWord = cleanName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    rawUser = firstWord.length >= 3 ? firstWord : `guru_${Date.now().toString().slice(-4)}`;
  }

  let finalUsername = rawUser;
  let counter = 1;
  while (db.users.some((u) => u.username.toLowerCase() === finalUsername)) {
    counter++;
    finalUsername = `${rawUser}${counter}`;
  }

  const finalPassword = password && String(password).trim().length >= 4 ? String(password).trim() : 'guru123';

  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(finalPassword, salt);

  const newUserId = `usr_${Date.now()}_${finalUsername}`;
  const newUser: User = {
    id: newUserId,
    name: cleanName,
    username: finalUsername,
    email: email?.trim() || `${finalUsername}@sdnoehendak.sch.id`,
    password: hashedPassword,
    role: 'guru',
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  const newTeacherId = `tch_${Date.now()}`;
  const newTeacher: Teacher = {
    id: newTeacherId,
    user_id: newUserId,
    nip: nip ? String(nip).trim() : '-',
    name: cleanName,
    class_id: class_id || undefined,
    phone: phone ? String(phone).trim() : '',
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  db.users.push(newUser);
  db.teachers.push(newTeacher);

  // If class is assigned, update class teacher_id and release previous teacher of that class
  if (class_id) {
    const targetClass = db.classes.find((c) => c.id === class_id);
    if (targetClass) {
      // Release any other teacher assigned to this class
      const prevTeacher = db.teachers.find((t) => t.class_id === class_id && t.id !== newTeacher.id);
      if (prevTeacher) {
        prevTeacher.class_id = undefined;
        prevTeacher.updated_at = now;
      }
      targetClass.teacher_id = newTeacher.id;
      targetClass.teacher_name = newTeacher.name;
      targetClass.updated_at = now;
    }
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'TAMBAH_GURU',
    'teachers',
    `Admin menambahkan data guru baru: ${newTeacher.name} (NIP: ${newTeacher.nip})`,
    newTeacher.id
  );

  return res.status(201).json({
    message: `Data guru dan akun berhasil dibuat (Username: ${finalUsername}).`,
    teacher: newTeacher,
  });
});

// PUT /api/teachers/:id (Admin only)
router.put(['/:id', '/:id/'], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  const { name, nip, phone, email, password, class_id } = req.body || {};

  const db = getDB();
  const teacher = db.teachers.find((t) => t.id === id);

  if (!teacher) {
    return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
  }

  const now = new Date().toISOString();

  if (name) teacher.name = String(name).trim();
  if (nip !== undefined) teacher.nip = nip ? String(nip).trim() : '-';
  if (phone !== undefined) teacher.phone = phone ? String(phone).trim() : '';

  // Handle class reassignment
  if (class_id !== undefined) {
    // If was assigned to previous class
    if (teacher.class_id && teacher.class_id !== class_id) {
      const prevClass = db.classes.find((c) => c.id === teacher.class_id);
      if (prevClass && prevClass.teacher_id === teacher.id) {
        prevClass.teacher_id = undefined;
        prevClass.teacher_name = undefined;
        prevClass.updated_at = now;
      }
    }

    teacher.class_id = class_id || undefined;

    if (class_id) {
      const nextClass = db.classes.find((c) => c.id === class_id);
      if (nextClass) {
        // Release any other teacher assigned to nextClass
        const prevTeacher = db.teachers.find((t) => t.class_id === class_id && t.id !== teacher.id);
        if (prevTeacher) {
          prevTeacher.class_id = undefined;
          prevTeacher.updated_at = now;
        }
        nextClass.teacher_id = teacher.id;
        nextClass.teacher_name = teacher.name;
        nextClass.updated_at = now;
      }
    }
  } else if (teacher.class_id) {
    // If name changed, update class teacher_name
    const currentClass = db.classes.find((c) => c.id === teacher.class_id);
    if (currentClass && currentClass.teacher_id === teacher.id) {
      currentClass.teacher_name = teacher.name;
      currentClass.updated_at = now;
    }
  }

  teacher.updated_at = now;

  // Update linked user account
  const teacherUser = db.users.find((u) => u.id === teacher.user_id);
  if (teacherUser) {
    if (name) teacherUser.name = String(name).trim();
    if (email) teacherUser.email = String(email).trim();
    if (password && String(password).trim().length >= 4) {
      const salt = bcrypt.genSaltSync(10);
      teacherUser.password = bcrypt.hashSync(String(password).trim(), salt);
    }
    teacherUser.updated_at = now;
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'UBAH_GURU',
    'teachers',
    `Admin memperbarui data guru: ${teacher.name}`,
    teacher.id
  );

  return res.json({ message: 'Data guru berhasil diperbarui.', teacher });
});

// DELETE /api/teachers/:id (Admin only)
router.delete(['/:id', '/:id/'], authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user || { id: 'usr_admin', name: 'Administrator Sekolah', role: 'admin' as const };
  const db = getDB();
  const teacher = db.teachers.find((t) => t.id === id);

  if (!teacher) {
    return res.status(404).json({ error: 'Data guru tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  teacher.status = 'inactive';
  teacher.updated_at = now;

  // Unlink class
  if (teacher.class_id) {
    const cl = db.classes.find((c) => c.id === teacher.class_id);
    if (cl && cl.teacher_id === teacher.id) {
      cl.teacher_id = undefined;
      cl.teacher_name = undefined;
      cl.updated_at = now;
    }
    teacher.class_id = undefined;
  }

  // Deactivate user
  const teacherUser = db.users.find((u) => u.id === teacher.user_id);
  if (teacherUser) {
    teacherUser.status = 'inactive';
    teacherUser.updated_at = now;
  }

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'NONAKTIFKAN_GURU',
    'teachers',
    `Admin menonaktifkan akun guru: ${teacher.name}`,
    teacher.id
  );

  return res.json({ message: 'Data guru berhasil dinonaktifkan.' });
});

export default router;
