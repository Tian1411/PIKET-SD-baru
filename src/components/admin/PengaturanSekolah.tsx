import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { School, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const PengaturanSekolah: React.FC = () => {
  const { settings, updateSettingsState } = useAuth();
  const { showSuccess, showError } = useToast();

  const [schoolName, setSchoolName] = useState(settings?.school_name || 'UPTD SD NEGERI OEHENDAK');
  const [npsn, setNpsn] = useState(settings?.npsn || '50302819');
  const [address, setAddress] = useState(
    settings?.address || 'Jl. Oehendak No. 12, Kel. Oebufu, Kec. Oebobo, Kota Kupang, NTT'
  );
  const [phone, setPhone] = useState(settings?.phone || '(0380) 821945');
  const [email, setEmail] = useState(settings?.email || 'sdnoehendak@gmail.com');
  const [principalName, setPrincipalName] = useState(
    settings?.principal_name || 'Drs. Fransiskus Xaverius, M.Pd.'
  );
  const [principalNip, setPrincipalNip] = useState(
    settings?.principal_nip || '19680512 199303 1 008'
  );
  const [academicYear, setAcademicYear] = useState(settings?.academic_year || '2026/2027');
  const [semester, setSemester] = useState(settings?.semester || 'Semester Ganjil');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '/school-logo.png');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      if (settings.school_name) setSchoolName(settings.school_name);
      if (settings.npsn) setNpsn(settings.npsn);
      if (settings.address) setAddress(settings.address);
      if (settings.phone) setPhone(settings.phone);
      if (settings.email) setEmail(settings.email);
      if (settings.principal_name) setPrincipalName(settings.principal_name);
      if (settings.principal_nip) setPrincipalNip(settings.principal_nip);
      if (settings.academic_year) setAcademicYear(settings.academic_year);
      if (settings.semester) setSemester(settings.semester);
      if (settings.logo_url) setLogoUrl(settings.logo_url);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await api.updateSettings({
        school_name: schoolName,
        npsn,
        address,
        phone,
        email,
        principal_name: principalName,
        principal_nip: principalNip,
        academic_year: academicYear,
        semester,
        logo_url: logoUrl,
      });

      updateSettingsState(res.settings);
      setSuccessMsg('Pengaturan identitas sekolah berhasil disimpan!');
      showSuccess('Pengaturan identitas sekolah berhasil disimpan!');
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan pengaturan.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <img
              src={logoUrl || '/school-logo.png'}
              alt="Logo Sekolah"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              Identitas Sekolah & Pengaturan Sistem
            </h2>
            <p className="text-xs text-slate-500">
              Data ini digunakan pada Kop Surat resmi PDF, dokumen cetak, dan rekapitulasi Excel
            </p>
          </div>
        </div>

        {/* School Emblem Banner Preview */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-slate-50 to-blue-50/60 border border-amber-200/70 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white border border-amber-300 shadow-sm p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
            <img
              src={logoUrl || '/school-logo.png'}
              alt="Logo UPTD SD Negeri Oehendak"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Logo Resmi Terpasang
              </span>
              <span className="text-[11px] text-slate-500 font-medium">KOTA KUPANG • 2011</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 mt-1">
              UPTD SD NEGERI OEHENDAK
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Lambang resmi telah diterapkan pada header aplikasi, kartu login, kop laporan harian, dan dokumen cetak.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="my-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Resmi Satuan Pendidikan
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Pokok Sekolah Nasional (NPSN)
              </label>
              <input
                type="text"
                required
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Sekolah</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Telepon / Kontak
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Sekolah</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Informasi Kepala Sekolah (Untuk Pengesahan Dokumen)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={principalNip}
                  onChange={(e) => setPrincipalNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Kalender Akademik Aktif
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Semester Ganjil">Semester Ganjil</option>
                  <option value="Semester Genap">Semester Genap</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
