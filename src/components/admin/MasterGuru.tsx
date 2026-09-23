import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Teacher, SchoolClass } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, GraduationCap, X, AlertCircle, Phone, Lock, CheckCircle2 } from 'lucide-react';

export const MasterGuru: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [classId, setClassId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([api.getTeachers(), api.getClasses()]);
      setTeachers(tRes.teachers || []);
      setClasses(cRes.classes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);

  const openAddModal = () => {
    setEditingTeacher(null);
    setName('');
    setNip('');
    setPhone('');
    setEmail('');
    setUsername('');
    setPassword('guru123');
    setClassId('');
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
    setClassId(t.class_id || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingTeacher) {
        await api.updateTeacher(editingTeacher.id, {
          name: name.trim(),
          nip: nip.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          class_id: classId || undefined,
        });
        showSuccess('Data guru berhasil diperbarui.');
      } else {
        const cleanName = name.trim();
        const cleanUser = username.trim() || cleanName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `guru${Date.now().toString().slice(-4)}`;
        const cleanPass = password.trim() || 'guru123';

        await api.createTeacher({
          name: cleanName,
          nip: nip.trim() || '-',
          phone: phone.trim(),
          email: email.trim() || `${cleanUser}@sdnoehendak.sch.id`,
          username: cleanUser,
          password: cleanPass,
          class_id: classId || undefined,
        });
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
    if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan akun guru ${teacherName}?`)) return;
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
            Kelola data profil guru, penugasan kelas, dan akses login guru piket
          </p>
        </div>

        <button
          id="btn-add-teacher"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition self-start sm:self-auto"
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
                  <th className="py-3 px-3">Kelas yang Diampu</th>
                  <th className="py-3 px-3">Username Login</th>
                  <th className="py-3 px-3">Kontak / WhatsApp</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 text-center text-slate-500 font-bold">{idx + 1}</td>
                    <td className="py-3 px-3 font-extrabold text-slate-900 text-sm">
                      {t.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{t.nip || '-'}</td>
                    <td className="py-3 px-3">
                      {t.class_name ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          Kelas {t.class_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Guru Piket Umum</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-mono">
                      {(t as any).username || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{t.phone || '-'}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                          title="Ubah Data Guru"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Nonaktifkan Guru"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingTeacher ? 'Ubah Data Guru' : 'Tambah Guru & Akun Baru'}
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
                  Nama Lengkap Beserta Gelar
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tugaskan Sebagai Wali Kelas
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Guru Piket Umum / Belum Ditugaskan --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.class_name} (Tingkat {c.grade}){c.teacher_name && c.teacher_id !== editingTeacher?.id ? ` — Saat ini: ${c.teacher_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

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

              {!editingTeacher ? (
                <>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Username Login Guru
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Otomatis diisi dari nama guru, huruf kecil tanpa spasi.
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
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reset Password (Kosongkan jika tidak diubah)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
