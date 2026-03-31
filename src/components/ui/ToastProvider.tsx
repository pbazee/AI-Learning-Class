"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  visible: boolean;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastType, string> = {
  success: "border-l-4 border-l-emerald-400",
  error: "border-l-4 border-l-rose-400",
  warning: "border-l-4 border-l-amber-400",
  info: "border-l-4 border-l-blue-400",
};

const toneIcons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
  error: <AlertCircle className="h-4 w-4 text-rose-300" />,
  warning: <TriangleAlert className="h-4 w-4 text-amber-300" />,
  info: <Info className="h-4 w-4 text-blue-300" />,
};

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const enqueue = useCallback(
    (message: string, type: ToastType) => {
      console.log(`[toast.${type}]`, message);
      const id = createToastId();
      const nextToast: ToastItem = { id, message, type, visible: true };
      setToasts((current) => [...current, nextToast]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4000);
    },
    [dismissToast]
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      success: (message) => enqueue(message, "success"),
      error: (message) => enqueue(message, "error"),
      warning: (message) => enqueue(message, "warning"),
      info: (message) => enqueue(message, "info"),
      toast: (message, type = "info") => enqueue(message, type),
    }),
    [enqueue]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[99999] flex w-[min(92vw,24rem)] flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-xl border border-white/10 bg-[#060a12] px-4 py-3 shadow-2xl ${toneClasses[toast.type]}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{toneIcons[toast.type]}</span>
                <p className="flex-1 text-sm text-slate-100">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss toast"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
