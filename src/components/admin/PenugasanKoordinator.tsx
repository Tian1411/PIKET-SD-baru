import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DutyCoordinator, Teacher } from '../../types';
import {
  UserCheck,
  Plus,
  Edit2,
  Power,
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
} from 'lucide-react';

export const PenugasanKoordinator: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [coordinators, setCoordinators] = useState<DutyCoordinator[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState<DutyCoordinator | null>(null);

  // Form Fields
  const [teacherId, setTeacherId] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        api.getDutyCoordinators(),
        api.getTeachers(),
      ]);
      setCoordinators(cRes.coordinators || []);
      setTeachers(tRes.teachers || []);
    } catch (err: any) {
      console.error('Failed to load duty coordinators', err);
      showError(err.message || 'Gagal memuat data koordinator piket.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCoordinator(null);
    setTeacherId(teachers[0]?.id || '');
    setAcademicYear('2026/2027');
    setSemester('Ganjil');

    // Default dates for semester
    const today = new Date();
    const curYear = today.getFullYear();
    setStartDate(`${curYear}-07-01`);
    setEndDate(`${curYear}-12-31`);
    setStatus('active');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (coord: DutyCoordinator) => {
    setEditingCoordinator(coord);
    setTeacherId(coord.teacherId || coord.teacher_id || '');
    setAcademicYear(coord.academicYear || coord.academic_year || '2026/2027');
    setSemester((coord.semester as 'Ganjil' | 'Genap') || 'Ganjil');
    setStartDate(coord.startDate || coord.start_date || '');
    setEndDate(coord.endDate || coord.end_date || '');
    setStatus(coord.status || 'active');
    setFormError('');
    setModalOpen(true);
  };

  const handleSemesterChange = (newSemester: 'Ganjil' | 'Genap') => {
    setSemester(newSemester);
    // Auto-adjust default period dates when semester changes
    const curYear = new Date().getFullYear();
    if (newSemester === 'Ganjil') {
      setStartDate(`${curYear}-07-01`);
      setEndDate(`${curYear}-12-31`);
    } else {
      setStartDate(`${curYear + 1}-01-01`);
      setEndDate(`${curYear + 1}-06-30`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!teacherId) {
      setFormError('Guru wajib dipilih.');
      return;
    }
    if (!academicYear.trim()) {
      setFormError('Tahun pelajaran wajib diisi.');
      return;
    }
    if (!semester) {
      setFormError('Semester wajib dipilih.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Periode tanggal mulai dan selesai wajib diisi.');
      return;
    }
    if (endDate < startDate) {
      setFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCoordinator) {
        await api.updateDutyCoordinator(editingCoordinator.id, {
          teacherId,
          academicYear,
          semester,
          startDate,
          endDate,
          status,
        });
        showSuccess('Data penugasan Koordinator Piket berhasil diperbarui.');
      } else {
        await api.createDutyCoordinator({
          teacherId,
          academicYear,
          semester,
          startDate,
          endDate,
          status,
        });
        showSuccess('Koordinator Piket berhasil ditugaskan.');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan penugasan koordinator.';
      setFormError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (coord: DutyCoordinator) => {
    const nextStatus = coord.status === 'active' ? 'inactive' : 'active';
    const actionText = nextStatus === 'active' ? 'mengaktifkan' : 'menonaktifkan';

    if (!window.confirm(`Apakah Anda yakin ingin ${actionText} Koordinator Piket ${coord.teacherName}?`)) {
      return;
    }

    try {
      await api.toggleDutyCoordinatorStatus(coord.id, nextStatus);
      showSuccess(`Koordinator Piket ${coord.teacherName} berhasil ${nextStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}.`);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Gagal mengubah status koordinator.');
    }
  };

  // Find the currently active coordinator covering today
  const todayStr = new Date().toISOString().split('T')[0];
  const currentActiveCoordinator = coordinators.find((c) => {
    if (c.status !== 'active') return false;
    if (c.startDate && c.endDate) {
      return c.startDate <= todayStr && c.endDate >= todayStr;
    }
    return true;
  }) || coordinators.find((c) => c.status === 'active') || null;

  // Filtered coordinators for display
  const filteredCoordinators = coordinators.filter((c) => {
    const matchesSearch =
      (c.teacherName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.academicYear || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Manajemen Petugas Piket
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mt-0.5">
            Penugasan Koordinator Piket
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tentukan guru yang bertanggung jawab mengoordinasikan laporan piket harian sekolah
          </p>
        </div>

        <button
          id="btn-add-coordinator"
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-700/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Penugasan</span>
        </button>
      </div>

      {/* Active Coordinator Highlight Card */}
      <div className="bg-linear-to-br from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Koordinator Piket Aktif Saat Ini
                </span>
              </div>

              {currentActiveCoordinator ? (
                <>
                  <h3 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
                    {currentActiveCoordinator.teacherName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-blue-200/90 mt-2 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-300" />
                      Periode: {currentActiveCoordinator.startDate} s/d {currentActiveCoordinator.endDate}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-blue-400/50 hidden sm:inline-block" />
                    <span>Tahun Ajaran: {currentActiveCoordinator.academicYear}</span>
                    <span className="w-1 h-1 rounded-full bg-blue-400/50 hidden sm:inline-block" />
                    <span>Semester {currentActiveCoordinator.semester}</span>
                  </div>
                </>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-bold text-slate-300">
                    Belum ada Koordinator Piket aktif untuk periode tanggal saat ini.
                  </p>
                  <p className="text-xs text-blue-200/70 mt-0.5">
                    Klik tombol "+ Tambah Penugasan" di atas untuk menugaskan Koordinator Piket.
                  </p>
                </div>
              )}
            </div>
          </div>

          {currentActiveCoordinator && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 shrink-0 text-left md:text-right">
              <span className="text-[10px] uppercase tracking-wider text-blue-300 font-bold block">
                Status Operasional
              </span>
              <div className="flex items-center md:justify-end gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-emerald-300">BERTUGAS AKTIF</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama guru atau tahun pelajaran..."
            className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 shrink-0">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-44 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Tidak Aktif / Selesai</option>
          </select>
        </div>
      </div>

      {/* Coordinators Table */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-14 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat data penugasan koordinator...</p>
          </div>
        ) : filteredCoordinators.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Belum ada riwayat penugasan koordinator</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik "+ Tambah Penugasan" untuk menugaskan guru sebagai Koordinator Piket.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3">Nama Guru</th>
                  <th className="py-3 px-3 text-center">Tahun Pelajaran</th>
                  <th className="py-3 px-3 text-center">Semester</th>
                  <th className="py-3 px-3">Periode</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCoordinators.map((coord, idx) => {
                  const isActive = coord.status === 'active';
                  const isCurrent =
                    isActive &&
                    coord.startDate <= todayStr &&
                    coord.endDate >= todayStr;

                  return (
                    <tr
                      key={coord.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isCurrent ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {coord.teacherName}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              Aktif Sekarang
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Ditugaskan oleh: {coord.createdBy || 'Admin'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                        {coord.academicYear}
                      </td>
                      <td className="py-3.5 px-3 text-center font-semibold text-slate-600">
                        {coord.semester}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{coord.startDate} s/d {coord.endDate}</span>
                        </div>
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
                          {isActive ? 'Aktif' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(coord)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 transition border border-blue-200"
                            title="Edit Penugasan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(coord)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                              isActive
                                ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                            }`}
                            title={isActive ? 'Nonaktifkan Penugasan' : 'Aktifkan Penugasan'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
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
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingCoordinator ? 'Edit Penugasan Koordinator' : 'Tambah Penugasan Koordinator'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih guru pengajar dan tentukan masa bakti koordinator piket
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
              {/* Nama Guru Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Guru <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Daftar guru diambil langsung dari database tenaga pendidik
                </p>
              </div>

              {/* Tahun Pelajaran & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    Semester <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSemesterChange('Ganjil')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border text-center ${
                        semester === 'Ganjil'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Ganjil
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSemesterChange('Genap')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border text-center ${
                        semester === 'Genap'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Genap
                    </button>
                  </div>
                </div>
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Status Penugasan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Penugasan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="active">Aktif (Bertugas)</option>
                  <option value="inactive">Tidak Aktif (Riwayat / Selesai)</option>
                </select>
              </div>

              {/* Action Buttons */}
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
                    <span>Simpan Penugasan</span>
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
