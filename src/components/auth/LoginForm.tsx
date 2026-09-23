import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  School,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
} from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 px-4 py-8 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden p-6 sm:p-8">
          {/* Header & Logo */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-50/80 border border-amber-200 shadow-md mx-auto mb-3.5 flex items-center justify-center p-1.5 overflow-hidden">
              <img
                src="/school-logo.png"
                alt="Logo UPTD SD Negeri Oehendak"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.className = 'w-16 h-16 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-700/20';
                  }
                }}
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              UPTD SD NEGERI OEHENDAK
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Sistem Laporan Piket Harian & Presensi Siswa
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username atau NIP Guru
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="input-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP"
                  required
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-slate-400 hover:text-slate-600 absolute right-2 top-1.5 rounded-lg"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 font-extrabold text-sm text-white shadow-md shadow-blue-700/25 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Sistem</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500 mt-4 font-medium">
          Dinas Pendidikan & Kebudayaan Kota Kupang, NTT • Zona Waktu WITA
        </p>
      </div>
    </div>
  );
};
