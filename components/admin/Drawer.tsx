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
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-gray-200 bg-white p-6 shadow-2xl overflow-y-auto dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="mt-6 flex-1">{children}</div>
          {footer && (
            <div className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
