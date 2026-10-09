import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle, XCircle, Info } from "@phosphor-icons/react";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

const ToastContext = createContext<{ show: (message: string, type?: ToastType) => void } | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const icons = { success: <CheckCircle weight="fill" className="text-emerald-500" size={18} />,
    error: <XCircle weight="fill" className="text-red-500" size={18} />,
    info: <Info weight="fill" className="text-blue-500" size={18} /> };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id}
            className="flex items-center gap-2 bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-sm font-medium text-gray-800 animate-in slide-in-from-bottom-2 fade-in duration-200 min-w-[240px]">
            {icons[t.type]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.show;
};