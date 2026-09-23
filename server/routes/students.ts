import { Router, Response } from 'express';
import { getDB, saveDB, logAudit } from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../auth';
import { Student, Gender } from '../../src/types';

const router = Router();

// GET /api/students
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const db = getDB();
  const { class_id, search } = req.query;

  let students = db.students.filter((s) => s.status === 'active');

  // Authorization: Guru can ONLY see students in their assigned class
  if (user.role === 'guru') {
    if (!user.teacher || !user.teacher.class_id) {
      return res.json({ students: [] });
    }
    students = students.filter((s) => s.class_id === user.teacher!.class_id);
  } else if (class_id) {
    students = students.filter((s) => s.class_id === String(class_id));
  }

  // Search by name, NIS, or NISN
  if (search) {
    const q = String(search).toLowerCase().trim();
    students = students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nis.includes(q) ||
        s.nisn.includes(q)
    );
  }

  // Attach class name
  const enriched = students.map((s) => {
    const cl = db.classes.find((c) => c.id === s.class_id);
    return {
      ...s,
      class_name: cl?.class_name || 'Tidak Diketahui',
    };
  });

  // Sort by class, then student name
  enriched.sort((a, b) => {
    if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
    return a.name.localeCompare(b.name);
  });

  return res.json({ students: enriched });
});

// POST /api/students (Admin only)
router.post('/', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { nis, nisn, name, gender, class_id } = req.body;

  if (!nis || !nisn || !name || !gender || !class_id) {
    return res.status(400).json({ error: 'NIS, NISN, Nama Siswa, Jenis Kelamin (L/P), dan Kelas wajib diisi.' });
  }

  const db = getDB();

  // Validate Class
  const targetClass = db.classes.find((c) => c.id === class_id && c.status === 'active');
  if (!targetClass) {
    return res.status(400).json({ error: 'Kelas yang dipilih tidak valid.' });
  }

  // Check duplicate NIS or NISN
  const dupNis = db.students.find((s) => s.nis === String(nis).trim() && s.status === 'active');
  if (dupNis) {
    return res.status(400).json({ error: `NIS ${nis} sudah terdaftar atas nama ${dupNis.name}.` });
  }

  const dupNisn = db.students.find((s) => s.nisn === String(nisn).trim() && s.status === 'active');
  if (dupNisn) {
    return res.status(400).json({ error: `NISN ${nisn} sudah terdaftar atas nama ${dupNisn.name}.` });
  }

  const now = new Date().toISOString();
  const newStudent: Student = {
    id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    nis: String(nis).trim(),
    nisn: String(nisn).trim(),
    name: name.trim(),
    gender: (gender === 'P' ? 'P' : 'L') as Gender,
    class_id,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  db.students.push(newStudent);
  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'TAMBAH_SISWA',
    'students',
    `Admin menambahkan siswa: ${newStudent.name} ke kelas ${targetClass.class_name}`,
    newStudent.id
  );

  return res.status(201).json({
    message: 'Data siswa berhasil ditambahkan.',
    student: { ...newStudent, class_name: targetClass.class_name },
  });
});

// PUT /api/students/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { nis, nisn, name, gender, class_id } = req.body;

  const db = getDB();
  const student = db.students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  }

  if (nis && nis !== student.nis) {
    const dup = db.students.find((s) => s.nis === String(nis).trim() && s.id !== id && s.status === 'active');
    if (dup) return res.status(400).json({ error: `NIS ${nis} sudah digunakan oleh ${dup.name}.` });
    student.nis = String(nis).trim();
  }

  if (nisn && nisn !== student.nisn) {
    const dup = db.students.find((s) => s.nisn === String(nisn).trim() && s.id !== id && s.status === 'active');
    if (dup) return res.status(400).json({ error: `NISN ${nisn} sudah digunakan oleh ${dup.name}.` });
    student.nisn = String(nisn).trim();
  }

  if (name) student.name = name.trim();
  if (gender) student.gender = gender === 'P' ? 'P' : 'L';
  if (class_id) {
    const validClass = db.classes.find((c) => c.id === class_id);
    if (!validClass) return res.status(400).json({ error: 'Kelas tidak valid.' });
    student.class_id = class_id;
  }

  student.updated_at = new Date().toISOString();
  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'UBAH_SISWA',
    'students',
    `Admin memperbarui data siswa: ${student.name}`,
    student.id
  );

  return res.json({ message: 'Data siswa berhasil diperbarui.', student });
});

// PUT /api/students/:id/move (Admin only: Move student to another class)
router.put('/:id/move', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { target_class_id } = req.body;

  if (!target_class_id) {
    return res.status(400).json({ error: 'Kelas tujuan wajib dipilih.' });
  }

  const db = getDB();
  const student = db.students.find((s) => s.id === id);
  if (!student) return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });

  const targetClass = db.classes.find((c) => c.id === target_class_id && c.status === 'active');
  if (!targetClass) return res.status(400).json({ error: 'Kelas tujuan tidak ditemukan.' });

  const oldClass = db.classes.find((c) => c.id === student.class_id);
  const oldClassName = oldClass?.class_name || 'Sebelumnya';

  student.class_id = target_class_id;
  student.updated_at = new Date().toISOString();

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'PINDAH_KELAS_SISWA',
    'students',
    `Admin memindahkan siswa ${student.name} dari kelas ${oldClassName} ke kelas ${targetClass.class_name}`,
    student.id
  );

  return res.json({
    message: `Siswa ${student.name} berhasil dipindahkan ke kelas ${targetClass.class_name}.`,
    student,
  });
});

// DELETE /api/students/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const db = getDB();
  const student = db.students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
  }

  student.status = 'inactive';
  student.updated_at = new Date().toISOString();

  saveDB(db);

  logAudit(
    user.id,
    user.name,
    user.role,
    'NONAKTIFKAN_SISWA',
    'students',
    `Admin menonaktifkan data siswa: ${student.name}`,
    student.id
  );

  return res.json({ message: 'Data siswa berhasil dinonaktifkan.' });
});

// POST /api/students/import (Admin only)
// Receives JSON array of parsed rows: { nis, nisn, name, gender, class_name }
router.post('/import', authenticate, requireAdmin, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'File tidak berisi data atau format tidak sesuai.' });
  }

  const db = getDB();
  const now = new Date().toISOString();

  const successList: Student[] = [];
  const errors: { row: number; reason: string; item: any }[] = [];

  const existingNisSet = new Set(db.students.filter((s) => s.status === 'active').map((s) => s.nis));
  const existingNisnSet = new Set(db.students.filter((s) => s.status === 'active').map((s) => s.nisn));

  items.forEach((item, idx) => {
    const rowNum = idx + 2; // header is row 1
    const nis = String(item.nis || item.NIS || '').trim();
    const nisn = String(item.nisn || item.NISN || '').trim();
    const name = String(item.name || item.Nama || item['Nama Siswa'] || '').trim();
    const genderRaw = String(item.gender || item['L/P'] || item.Gender || '').trim().toUpperCase();
    const className = String(item.class_name || item.Kelas || item.kelas || '').trim();

    if (!nis || !nisn || !name || !className) {
      errors.push({ row: rowNum, reason: 'Kolom wajib (NIS, NISN, Nama, Kelas) ada yang kosong', item });
      return;
    }

    const gender: Gender = genderRaw.startsWith('P') ? 'P' : 'L';

    // Find class
    const targetClass = db.classes.find(
      (c) => c.class_name.toLowerCase() === className.toLowerCase() && c.status === 'active'
    );
    if (!targetClass) {
      errors.push({ row: rowNum, reason: `Kelas "${className}" tidak ditemukan dalam sistem.`, item });
      return;
    }

    // Check duplicate
    if (existingNisSet.has(nis)) {
      errors.push({ row: rowNum, reason: `NIS ${nis} sudah ada di database.`, item });
      return;
    }
    if (existingNisnSet.has(nisn)) {
      errors.push({ row: rowNum, reason: `NISN ${nisn} sudah ada di database.`, item });
      return;
    }

    existingNisSet.add(nis);
    existingNisnSet.add(nisn);

    const newStd: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${idx}`,
      nis,
      nisn,
      name,
      gender,
      class_id: targetClass.id,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    db.students.push(newStd);
    successList.push(newStd);
  });

  if (successList.length > 0) {
    saveDB(db);

    logAudit(
      user.id,
      user.name,
      user.role,
      'IMPORT_EXCEL_SISWA',
      'students',
      `Admin mengimpor ${successList.length} siswa baru melalui Excel. Gagal: ${errors.length} baris.`
    );
  }

  return res.json({
    message: `Proses impor selesai. ${successList.length} siswa berhasil ditambahkan.`,
    total_imported: successList.length,
    failed_count: errors.length,
    errors,
  });
});

export default router;
