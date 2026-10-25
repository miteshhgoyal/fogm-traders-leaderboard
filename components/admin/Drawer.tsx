"use client";

import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ isOpen, title, description, onClose, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-[f-fadein_.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-hairline bg-card p-6 shadow-2xl overflow-y-auto animate-[f-modalin_.25s_var(--ease)] flex flex-col justify-between text-ink">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-hairline">
              <div>
                <h2 className="text-ctitle font-semibold text-ink">{title}</h2>
                {description && <p className="text-meta text-mute mt-0.5">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-mute hover:bg-alt hover:text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Close panel"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </div>
          {footer && (
            <div className="pt-4 mt-6 border-t border-hairline flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
