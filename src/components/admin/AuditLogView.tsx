import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLog } from '../../types';
import { ShieldCheck, Clock, User, RefreshCw } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({ limit: '100' });
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const actionBadge = (act: string) => {
    if (act.includes('LOGIN')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          {act}
        </span>
      );
    }
    if (act.includes('DELETE') || act.includes('LOCK')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          {act}
        </span>
      );
    }
    if (act.includes('IMPORT') || act.includes('CREATE') || act.includes('SUBMIT')) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {act}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
        {act}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
            Log Aktivitas Sistem (Audit Trail)
          </h2>
          <p className="text-xs text-slate-500">
            Rekam jejak setiap tindakan pengguna (login, input laporan, perubahan data, dan ekspor)
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Log</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Memuat log aktivitas...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Belum ada riwayat aktivitas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Waktu (WITA)</th>
                  <th className="py-3 px-3">Pengguna</th>
                  <th className="py-3 px-3">Peran</th>
                  <th className="py-3 px-3">Aksi</th>
                  <th className="py-3 px-3">Rincian Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{log.user_name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{actionBadge(log.action)}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
