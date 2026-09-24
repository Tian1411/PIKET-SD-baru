import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Teacher, SchoolClass } from '../../types';
import { useToast } from '../../context/ToastContext';
import { extractGradeAndSection } from '../../services/firestoreService';
import {
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  X,
  AlertCircle,
  Phone,
  Lock,
  CheckCircle2,
  School,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';

interface MasterGuruProps {
  onNavigateToClasses?: () => void;
}

const ROMBEL_OPTIONS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const MasterGuru: React.FC<MasterGuruProps> = ({ onNavigateToClasses }) => {
  const { showSuccess, showError } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Edit State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  // Wali Kelas Fields
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [reassignConfirmed, setReassignConfirmed] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);

  // Initial assigned state when editing
  const [initialClassId, setInitialClassId] = useState<string>('');
  const [initialClassName, setInitialClassName] = useState<string>('');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([api.getTeachers(), api.getClasses()]);
      setTeachers(tRes.teachers || []);
      setClasses(cRes.classes || []);
    } catch (err) {
      console.error('Gagal memuat data guru:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to find matching class in classes collection
  const findMatchingClass = (gradeNum: number, secStr: string): SchoolClass | undefined => {
    if (!gradeNum || !secStr) return undefined;
    const cleanSec = secStr.trim().toUpperCase();

    return classes.find((c) => {
      // Direct grade & section match
      if (c.grade === gradeNum && c.section && c.section.toUpperCase() === cleanSec) {
        return true;
      }
      // Derived from class_name
      const { grade: pGrade, section: pSection } = extractGradeAndSection(c.class_name, c.grade);
      if ((c.grade === gradeNum || pGrade === gradeNum) && pSection.toUpperCase() === cleanSec) {
        return true;
      }
      // Exact name match
      const romanMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
      const roman = romanMap[gradeNum] || '';
      const cleanName = c.class_name.toUpperCase().replace(/\s+/g, ' ').trim();
      return (
        cleanName === `${gradeNum} ${cleanSec}` ||
        cleanName === `${roman} ${cleanSec}` ||
        cleanName === `KELAS ${gradeNum} ${cleanSec}` ||
        cleanName === `KELAS ${roman} ${cleanSec}`
      );
    });
  };

  // Formed class name & matched class in database
  const formedClassName = useMemo(() => {
    if (!selectedGrade || !selectedSection) return '';
    return `${selectedGrade} ${selectedSection}`;
  }, [selectedGrade, selectedSection]);

  const matchedClass = useMemo(() => {
    if (!selectedGrade || !selectedSection) return undefined;
    return findMatchingClass(Number(selectedGrade), selectedSection);
  }, [selectedGrade, selectedSection, classes]);

  // Conflict: Does this class already have an active wali kelas from another teacher?
  const existingWaliKelasName = useMemo(() => {
    if (!matchedClass) return null;
    if (matchedClass.teacher_id && matchedClass.teacher_id !== editingTeacher?.id) {
      return matchedClass.teacher_name || 'Guru lain';
    }
    // Also check teachers list
    const otherTeacher = teachers.find(
      (t) => t.id !== editingTeacher?.id && t.class_id === matchedClass.id && t.status === 'active'
    );
    if (otherTeacher) {
      return otherTeacher.name;
    }
    return null;
  }, [matchedClass, editingTeacher, teachers]);

  // Reassignment detection: Teacher already assigned to another class
  const isReassigning = useMemo(() => {
    if (!editingTeacher || !initialClassId || !matchedClass) return false;
    return initialClassId !== matchedClass.id;
  }, [editingTeacher, initialClassId, matchedClass]);

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setNip('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('guru123');
    setIsWaliKelas(false);
    setSelectedGrade('');
    setSelectedSection('');
    setReassignConfirmed(false);
    setShowUnassignConfirm(false);
    setInitialClassId('');
    setInitialClassName('');
    setFormError('');
    setUsernameManuallyEdited(false);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTeacher && !usernameManuallyEdited) {
      const cleanFirst = val.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanFirst.length >= 3) {
        setUsername(cleanFirst);
      }
    }
  };

  const openEditModal = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setNip(t.nip || '');
    setPhone(t.phone || '');
    setEmail((t as any).email || '');
    setUsername((t as any).username || '');
    setPassword('');

    // Pre-populate wali kelas if assigned
    const hasAssignment = Boolean(t.is_wali_kelas || t.class_id);
    setIsWaliKelas(hasAssignment);

    if (hasAssignment && t.class_id) {
      setInitialClassId(t.class_id);
      const assignedClass = classes.find((c) => c.id === t.class_id);
      const parsed = extractGradeAndSection(assignedClass?.class_name || t.class_name || '', assignedClass?.grade || t.grade);
      const g = String(t.grade || assignedClass?.grade || parsed.grade || '');
      const s = (t.section || assignedClass?.section || parsed.section || '').toUpperCase();

      setSelectedGrade(g);
      setSelectedSection(s);
      setInitialClassName(g && s ? `${g} ${s}` : assignedClass?.class_name || t.class_name || '');
    } else {
      setSelectedGrade('');
      setSelectedSection('');
      setInitialClassId('');
      setInitialClassName('');
    }

    setReassignConfirmed(false);
    setShowUnassignConfirm(false);
    setFormError('');
    setModalOpen(true);
  };

  const handleToggleWaliKelas = () => {
    if (isWaliKelas) {
      // If teacher previously had an active assignment, ask for confirmation
      if (initialClassId) {
        setShowUnassignConfirm(true);
      } else {
        setIsWaliKelas(false);
        setSelectedGrade('');
        setSelectedSection('');
      }
    } else {
      setIsWaliKelas(true);
      // Restore previous grade/section if available
      if (initialClassName) {
        const parts = initialClassName.split(' ');
        if (parts.length >= 2) {
          setSelectedGrade(parts[0]);
          setSelectedSection(parts[1]);
        }
      }
    }
  };

  const handleConfirmUnassign = () => {
    setIsWaliKelas(false);
    setSelectedGrade('');
    setSelectedSection('');
    setShowUnassignConfirm(false);
    setReassignConfirmed(false);
  };

  const handleCancelReassign = () => {
    // Revert selection back to initial assigned class
    if (initialClassName) {
      const parts = initialClassName.split(' ');
      if (parts.length >= 2) {
        setSelectedGrade(parts[0]);
        setSelectedSection(parts[1]);
      }
    }
    setReassignConfirmed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation 1: Wali Kelas checked but Tingkat or Rombel empty
    if (isWaliKelas) {
      if (!selectedGrade || !selectedSection) {
        const err = 'Silakan pilih tingkat dan rombel kelas.';
        setFormError(err);
        showError(err);
        return;
      }

      // Validation 2: Class not found in database
      if (!matchedClass) {
        const err = `Kelas ${formedClassName} belum tersedia. Silakan buat kelas tersebut terlebih dahulu pada menu Data Master → Kelas.`;
        setFormError(err);
        showError(err);
        return;
      }

      // Validation 3: Class already has another active Wali Kelas
      if (existingWaliKelasName) {
        const err = `Kelas ${formedClassName} sudah memiliki wali kelas aktif: ${existingWaliKelasName}.`;
        setFormError(err);
        showError(err);
        return;
      }

      // Validation 4: Reassignment requires explicit confirmation
      if (isReassigning && !reassignConfirmed) {
        const err = `Guru ini sudah ditugaskan sebagai wali kelas ${initialClassName}. Klik 'Pindahkan Penugasan' untuk mengonfirmasi.`;
        setFormError(err);
        showError(err);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (editingTeacher) {
        const updatePayload: any = {
          name: name.trim(),
          nip: nip.trim(),
          phone: phone.trim(),
          email: email.trim(),
          is_wali_kelas: isWaliKelas,
          class_id: isWaliKelas && matchedClass ? matchedClass.id : null,
          academic_year: '2026/2027',
          reassign_confirmed: reassignConfirmed,
        };
        if (password.trim()) {
          updatePayload.password = password.trim();
        }
        if (isWaliKelas && selectedGrade) {
          updatePayload.grade = Number(selectedGrade);
        }
        if (isWaliKelas && selectedSection) {
          updatePayload.section = selectedSection.toUpperCase();
        }

        await api.updateTeacher(editingTeacher.id, updatePayload);
        showSuccess('Data guru dan status penugasan berhasil diperbarui.');
      } else {
        const cleanName = name.trim();
        const cleanUser =
          username.trim() ||
          cleanName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') ||
          `guru${Date.now().toString().slice(-4)}`;
        const cleanPass = password.trim() || 'guru123';

        const createPayload: any = {
          name: cleanName,
          nip: nip.trim() || '-',
          phone: phone.trim(),
          email: email.trim() || `${cleanUser}@sdnoehendak.sch.id`,
          username: cleanUser,
          password: cleanPass,
          is_wali_kelas: isWaliKelas,
          academic_year: '2026/2027',
        };
        if (isWaliKelas && matchedClass) {
          createPayload.class_id = matchedClass.id;
          if (selectedGrade) createPayload.grade = Number(selectedGrade);
          if (selectedSection) createPayload.section = selectedSection.toUpperCase();
        }

        await api.createTeacher(createPayload);
        showSuccess(`Guru ${cleanName} berhasil ditambahkan.`);
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan data guru.';
      setFormError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, teacherName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan akun guru ${teacherName}? Penugasan wali kelas yang bersangkutan juga akan dinonaktifkan.`)) {
      return;
    }
    try {
      await api.deleteTeacher(id);
      showSuccess(`Akun guru ${teacherName} berhasil dinonaktifkan.`);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Gagal menonaktifkan guru.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            Master Data Guru & Wali Kelas
          </h2>
          <p className="text-xs text-slate-500">
            Kelola data profil guru, penugasan resmi wali kelas per tahun pelajaran, dan akses login guru piket
          </p>
        </div>

        <button
          id="btn-add-teacher"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat data guru...</p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <GraduationCap className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Belum ada data guru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3">Nama Lengkap & Gelar</th>
                  <th className="py-3 px-3">NIP</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3">Status Wali Kelas</th>
                  <th className="py-3 px-3">Username Login</th>
                  <th className="py-3 px-3">Kontak / WhatsApp</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t, idx) => {
                  const hasWali = Boolean(t.is_wali_kelas || t.class_id);
                  const displayClassName = t.class_name ? `Kelas ${t.class_name}` : (t.grade && t.section ? `Kelas ${t.grade} ${t.section}` : '-');

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-slate-900 text-sm block">
                          {t.name}
                        </span>
                        {hasWali && (
                          <span className="text-[11px] text-blue-600 font-medium">
                            Wali {displayClassName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px]">{t.nip || '-'}</td>
                      <td className="py-3.5 px-3">
                        {hasWali && t.class_name ? (
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                            {t.class_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {hasWali ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Wali Kelas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                            Belum ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-mono text-[11px]">
                        {(t as any).username || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{t.phone || '-'}</td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(t)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            title="Ubah Data Guru & Penugasan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Nonaktifkan Guru"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTeacher ? 'Ubah Data Guru & Penugasan' : 'Tambah Guru & Penugasan Baru'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tahun Pelajaran 2026/2027 • UPTD SD NEGERI OEHENDAK
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Beserta Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: Maria Goreti, S.Pd."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Guru (Nomor Induk Pegawai)
                </label>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="19840214 200801 2 007 (atau '-' jika belum ada)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              {/* ---------------- SECTION: PENUGASAN WALI KELAS ---------------- */}
              <div className="pt-3 pb-1 border-t border-slate-100">
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isWaliKelas}
                        onChange={handleToggleWaliKelas}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-extrabold text-slate-900">
                        Tugaskan sebagai Wali Kelas
                      </span>
                    </label>

                    {isWaliKelas && initialClassName && editingTeacher && (
                      <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                        Kelas saat ini: <span className="text-blue-700 font-extrabold">{initialClassName}</span>
                      </span>
                    )}
                  </div>

                  {/* Dropdowns when checked */}
                  {isWaliKelas && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Tingkat / Kelas Dropdown */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tingkat/Kelas <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={selectedGrade}
                            onChange={(e) => {
                              setSelectedGrade(e.target.value);
                              setReassignConfirmed(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                          >
                            <option value="">[ Pilih Kelas ▼ ]</option>
                            <option value="1">Kelas 1</option>
                            <option value="2">Kelas 2</option>
                            <option value="3">Kelas 3</option>
                            <option value="4">Kelas 4</option>
                            <option value="5">Kelas 5</option>
                            <option value="6">Kelas 6</option>
                          </select>
                        </div>

                        {/* Rombel Dropdown */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Rombel <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={selectedSection}
                            onChange={(e) => {
                              setSelectedSection(e.target.value);
                              setReassignConfirmed(false);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                          >
                            <option value="">[ Pilih Rombel ▼ ]</option>
                            {ROMBEL_OPTIONS.map((rombel) => (
                              <option key={rombel} value={rombel}>
                                {rombel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Display resolved info */}
                      {selectedGrade && selectedSection && (
                        <div className="space-y-2 pt-1">
                          {matchedClass ? (
                            <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 text-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-blue-700 font-semibold">Kelas yang ditugaskan:</p>
                                    <p className="text-sm font-extrabold text-blue-950">
                                      Kelas {formedClassName}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono bg-blue-200/60 text-blue-900 px-2 py-0.5 rounded font-bold">
                                  T.P. 2026/2027
                                </span>
                              </div>

                              {matchedClass.total_students !== undefined && (
                                <p className="text-[11px] text-blue-700 mt-1 pl-6">
                                  Terdaftar: <span className="font-bold">{matchedClass.total_students} siswa</span> di kelas ini
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Kelas {formedClassName} belum tersedia.</p>
                                  <p className="text-amber-700 mt-0.5">
                                    Silakan buat kelas tersebut terlebih dahulu pada menu Data Master → Kelas.
                                  </p>
                                </div>
                              </div>
                              {onNavigateToClasses && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalOpen(false);
                                    onNavigateToClasses();
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                                >
                                  <School className="w-3.5 h-3.5" />
                                  <span>Kelola Kelas</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Conflict Validation: Class already has another active Wali Kelas */}
                          {existingWaliKelasName && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">Kelas {formedClassName} sudah memiliki wali kelas aktif.</p>
                                  <p className="text-rose-700 mt-0.5">
                                    Wali kelas saat ini: <span className="font-extrabold">{existingWaliKelasName}</span>
                                  </p>
                                  <p className="text-[10px] text-rose-600 mt-1">
                                    Satu kelas hanya boleh memiliki satu wali kelas aktif. Admin harus melakukan perubahan secara sadar.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reassign Validation: Teacher already assigned to another class */}
                          {isReassigning && !existingWaliKelasName && matchedClass && (
                            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-2">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-bold">
                                    Guru ini sudah ditugaskan sebagai wali kelas {initialClassName}.
                                  </p>
                                  <p className="text-orange-800 text-[11px] mt-0.5">
                                    Apakah Anda yakin ingin memindahkan penugasan dari Kelas {initialClassName} ke Kelas {formedClassName}?
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={handleCancelReassign}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReassignConfirmed(true)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                    reassignConfirmed
                                      ? 'bg-emerald-600 text-white cursor-default'
                                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                                  }`}
                                >
                                  {reassignConfirmed ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Penugasan Disetujui Dipindahkan</span>
                                    </>
                                  ) : (
                                    <span>Pindahkan Penugasan</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@sdnoehendak.sch.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Login credentials */}
              {!editingTeacher ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username Login Guru <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameManuallyEdited(true);
                      }}
                      placeholder="contoh: maria"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Otomatis dibuat dari nama guru, huruf kecil tanpa spasi.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kata Sandi Awal (Bawaan: guru123)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Default: guru123"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reset Password (Kosongkan jika tidak ingin mengubah)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (isWaliKelas && (!selectedGrade || !selectedSection || !matchedClass || Boolean(existingWaliKelasName) || (isReassigning && !reassignConfirmed)))
                  }
                  className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-xs font-bold text-white shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal when unchecking Wali Kelas */}
      {showUnassignConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Hapus Penugasan Wali Kelas?
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Apakah Anda yakin ingin menghapus penugasan wali kelas untuk guru ini?
                </p>
                {initialClassName && (
                  <p className="text-xs font-bold text-blue-700 mt-1">
                    Kelas: {initialClassName} (T.P. 2026/2027)
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Histori penugasan sebelumnya akan diubah statusnya menjadi nonaktif di database.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUnassignConfirm(false)}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUnassign}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Ya, Hapus Penugasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
