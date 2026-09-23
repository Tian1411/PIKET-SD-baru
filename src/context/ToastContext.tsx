import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export const notify = {
  success: (msg: string) => globalShowToast?.(msg, 'success'),
  error: (msg: string) => globalShowToast?.(msg, 'error'),
  info: (msg: string) => globalShowToast?.(msg, 'info'),
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, type, message };
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  globalShowToast = showToast;

  const showSuccess = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const showError = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const showInfo = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${
                isSuccess
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                  : isError
                  ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                  : 'bg-blue-50/95 border-blue-300 text-blue-950'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
                {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1 text-sm font-semibold leading-snug">
                {toast.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (m: string, t?: ToastType) => notify[t || 'success'](m),
      showSuccess: notify.success,
      showError: notify.error,
      showInfo: notify.info,
    };
  }
  return ctx;
};
