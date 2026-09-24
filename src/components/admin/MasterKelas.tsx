import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { SchoolClass, Teacher } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  School,
  User,
  Check,
  X,
  AlertCircle,
  Users,
  Search,
  Filter,
} from 'lucide-react';

export const MasterKelas: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);

  // Form fields
  const [grade, setGrade] = useState<number>(1);
  const [section, setSection] = useState<string>('A');
  const [className, setClassName] = useState('1 A');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [teacherId, setTeacherId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([api.getClasses(), api.getTeachers()]);
      const fetchedClasses = cRes.classes || [];

      // Sort classes logically: Grade ascending (1..6), then section/className ascending (A..Z)
      fetchedClasses.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        const secA = (a.section || a.class_name.match(/[A-Za-z]+$/)?.[0] || '').toUpperCase();
        const secB = (b.section || b.class_name.match(/[A-Za-z]+$/)?.[0] || '').toUpperCase();
        return secA.localeCompare(secB) || a.class_name.localeCompare(b.class_name);
      });

      setClasses(fetchedClasses);
      setTeachers(tRes.teachers || []);
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Gagal memuat data kelas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingClass(null);
    setGrade(1);
    setSection('A');
    setClassName('1 A');
    setAcademicYear('2026/2027');
    setTeacherId('');
    setStatus('active');
    setFormError('');
    setModalOpen(true);
  };

  const handleGradeChange = (g: number) => {
    setGrade(g);
    setClassName(`${g} ${section}`.trim());
  };

  const handleSectionChange = (s: string) => {
    const cleanSection = s.toUpperCase();
    setSection(cleanSection);
    setClassName(`${grade} ${cleanSection}`.trim());
  };

  const openEditModal = (c: SchoolClass) => {
    setEditingClass(c);
    const g = c.grade || 1;
    const s = (c.section || c.class_name.match(/[A-Za-z]+$/)?.[0] || 'A').toUpperCase();
    setGrade(g);
    setSection(s);
    setClassName(c.class_name);
    setAcademicYear(c.academic_year || '2026/2027');
    setTeacherId(c.teacher_id || '');
    setStatus(c.status || 'active');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = className.trim() || `${grade} ${section}`;
    const cleanSection = (section.trim() || 'A').toUpperCase();

    // Client-side duplicate verification
    const isDuplicate = classes.some((c) => {
      if (editingClass && c.id === editingClass.id) return false;
      const sameYear = (c.academic_year || c.academicYear) === academicYear;
      if (!sameYear) return false;

      const cSec = (c.section || c.class_name.match(/[A-Za-z]+$/)?.[0] || '').toUpperCase();
      if (c.grade === grade && cSec === cleanSection) return true;

      const normalize = (val: string) => val.toLowerCase().replace(/kelas\s*/i, '').replace(/[^a-z0-9]/g, '');
      return normalize(c.class_name) === normalize(cleanName);
    });

    if (isDuplicate) {
      const err = `Kelas ${cleanName} sudah tersedia pada tahun pelajaran ini.`;
      setFormError(err);
      showError(err);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          class_name: cleanName,
          grade,
          section: cleanSection,
          academic_year: academicYear,
          teacher_id: teacherId || undefined,
          status,
        });
        showSuccess(`Data kelas ${cleanName} berhasil diperbarui.`);
      } else {
        await api.createClass({
          class_name: cleanName,
          grade,
          section: cleanSection,
          academic_year: academicYear,
          teacher_id: teacherId || undefined,
          status,
        });
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

  const filteredClasses = classes.filter((cls) => {
    const matchesGrade =
      selectedGradeFilter === 'all'
        ? true
        : cls.grade.toString() === selectedGradeFilter;
    const matchesSearch =
      cls.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cls.teacher_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pengelolaan Struktur Kelas
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
            Master Data Kelas & Rombel Paralel
          </h2>
          <p className="text-xs text-slate-500">
            Kelola kelas paralel (contoh: 1 A, 1 B, 1 C) dan penugasan wali kelas UPTD SD Negeri Oehendak
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama kelas atau wali kelas..."
            className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Filter Tingkat:</span>
          <select
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="all">Semua Tingkat</option>
            <option value="1">Kelas 1</option>
            <option value="2">Kelas 2</option>
            <option value="3">Kelas 3</option>
            <option value="4">Kelas 4</option>
            <option value="5">Kelas 5</option>
            <option value="6">Kelas 6</option>
          </select>
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat data kelas...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <School className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Belum ada data kelas</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik "+ Tambah Kelas Baru" untuk membuat kelas paralel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 text-center">Tingkat</th>
                  <th className="py-3 px-3 text-center">Rombel</th>
                  <th className="py-3 px-3">Nama Kelas</th>
                  <th className="py-3 px-3">Wali Kelas</th>
                  <th className="py-3 px-3 text-center">Jumlah Siswa</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.map((cls, idx) => {
                  const displaySection =
                    cls.section ||
                    cls.class_name.match(/[A-Za-z]+$/)?.[0] ||
                    '-';
                  const isActive = cls.status === 'active';

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs">
                          Kelas {cls.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-black text-slate-800 text-sm">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 inline-flex items-center justify-center">
                          {displaySection}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-black text-slate-900 text-sm">
                          Kelas {cls.class_name}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          T.A: {cls.academic_year}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className={cls.teacher_name ? 'font-bold text-slate-800' : 'text-slate-400 italic'}>
                            {cls.teacher_name || 'Belum Ditugaskan'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-center font-black text-slate-900">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{cls.total_students || 0} Siswa</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cls)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 transition border border-blue-200"
                            title="Ubah Kelas"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id, cls.class_name)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 transition border border-rose-200"
                            title="Nonaktifkan Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingClass ? 'Ubah Data Kelas' : 'Tambah Kelas Paralel Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tentukan tingkat dan rombel untuk membentuk kelas unik
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Tingkat & Rombel Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tingkat / Grade */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat / Grade <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => handleGradeChange(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rombel / Sub Kelas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rombel / Sub Kelas <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    {['A', 'B', 'C', 'D'].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSectionChange(sec)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition border text-center ${
                          section === sec
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                    <input
                      type="text"
                      maxLength={4}
                      value={!['A', 'B', 'C', 'D'].includes(section) ? section : ''}
                      onChange={(e) => handleSectionChange(e.target.value)}
                      placeholder="Lain"
                      className="w-16 px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Nama Kelas (Otomatis & Editable) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400">
                    Kelas
                  </span>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: 1 A"
                    className="w-full pl-16 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Diformat otomatis sesuai Tingkat & Rombel (Contoh: "1 A", "1 B", "2 C").
                </p>
              </div>

              {/* Tahun Pelajaran & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tahun Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                    <option value="2027/2028">2027/2028</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Kelas
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Wali Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wali Kelas / Guru Piket
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Belum Ditugaskan --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-700/20 transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kelas</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
