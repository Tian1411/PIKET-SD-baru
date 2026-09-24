import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { SchoolClass, Teacher } from '../../types';
import { Plus, Edit2, Trash2, School, User, Check, X, AlertCircle } from 'lucide-react';

export const MasterKelas: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Form fields
  const [className, setClassName] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [teacherId, setTeacherId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([api.getClasses(), api.getTeachers()]);
      setClasses(cRes.classes || []);
      setTeachers(tRes.teachers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setClassName('');
    setGrade(1);
    setAcademicYear('2026/2027');
    setTeacherId('');
    setFormError('');
    setModalOpen(true);
  };

  const handleClassNameChange = (val: string) => {
    setClassName(val);
    const clean = val.replace(/^kelas\s+/i, '').trim();
    const match = clean.match(/^(vi|iv|v|iii|ii|i|[1-6])/i);
    if (match) {
      const gStr = match[1].toUpperCase();
      const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
      const detected = romanMap[gStr] || parseInt(gStr, 10);
      if (detected && detected >= 1 && detected <= 6) {
        setGrade(detected);
      }
    }
  };

  const openEditModal = (c: SchoolClass) => {
    setEditingClass(c);
    setClassName(c.class_name);
    setGrade(c.grade);
    setAcademicYear(c.academic_year);
    setTeacherId(c.teacher_id || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const cleanName = className.trim();
      const detectedSection = cleanName.match(/[A-Za-z]$/)?.[0]?.toUpperCase() || '';

      const payloadData: any = {
        class_name: cleanName,
        grade,
        section: detectedSection,
        academic_year: academicYear,
      };
      if (teacherId) {
        payloadData.teacher_id = teacherId;
      } else if (editingClass) {
        payloadData.teacher_id = null;
      }

      if (editingClass) {
        await api.updateClass(editingClass.id, payloadData);
        showSuccess(`Data kelas ${cleanName} berhasil diperbarui.`);
      } else {
        await api.createClass(payloadData);
        showSuccess(`Kelas ${cleanName} berhasil ditambahkan.`);
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan data kelas.';
      setFormError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan kelas ${name}?`)) return;
    try {
      await api.deleteClass(id);
      showSuccess(`Kelas ${name} berhasil dinonaktifkan.`);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Gagal menonaktifkan kelas.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            Master Data Kelas
          </h2>
          <p className="text-xs text-slate-500">
            Kelola daftar kelas dan penugasan wali kelas UPTD SD Negeri Oehendak
          </p>
        </div>

        <button
          id="btn-add-class"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat data kelas...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <School className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Belum ada data kelas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Nama Kelas</th>
                  <th className="py-3 px-3 text-center">Tingkat</th>
                  <th className="py-3 px-3">Guru Wali / Piket</th>
                  <th className="py-3 px-3 text-center">Jumlah Siswa</th>
                  <th className="py-3 px-3 text-center">Tahun Ajaran</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classes.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900 text-sm">
                      Kelas {cls.class_name}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">
                      Kelas {cls.grade}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">
                      {cls.teacher_name || 'Belum Ditugaskan'}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      {cls.total_students || 0} Siswa
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">
                      {cls.academic_year}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(cls)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                          title="Ubah Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls.id, cls.class_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Nonaktifkan Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingClass ? 'Ubah Data Kelas' : 'Tambah Kelas Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas (Contoh: I A, V B, VI C)
                </label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => handleClassNameChange(e.target.value)}
                  placeholder="I A atau V B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tingkatan Kelas
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {[1, 2, 3, 4, 5, 6].map((g) => (
                    <option key={g} value={g}>
                      Kelas {g} (Sekolah Dasar)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wali Kelas / Guru Piket
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {teachers.map((t) => {
                    const currentCls = classes.find(
                      (c) => c.teacher_id === t.id && c.id !== (editingClass?.id || '')
                    );
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP: {t.nip}){currentCls ? ` — Saat ini Wali Kelas ${currentCls.class_name}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white shadow-md transition"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
