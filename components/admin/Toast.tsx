"use client";

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    nextId.current += 1;
    const id = `toast_${nextId.current}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-[0_16px_36px_-12px_rgba(0,0,0,.5)] border border-hairline bg-card/95 backdrop-blur-md text-cell font-medium text-ink transition-all animate-[f-modalin_.25s_var(--ease)]"
          >
            <div className="flex items-center gap-2.5">
              {t.type === "error" ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-down/15 text-down text-xs font-bold">
                  ✕
                </span>
              ) : t.type === "info" ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                  ℹ
                </span>
              ) : (
                <span className="flex size-6 items-center justify-center rounded-full bg-up/15 text-up text-xs font-bold">
                  ✓
                </span>
              )}
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-mute hover:text-ink p-1 rounded-lg transition"
              aria-label="Dismiss notification"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
