"use client";

import { useState, useEffect, type ReactNode } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  typeToConfirm?: string;
  confirmPhrase?: string;
  variant?: "danger" | "primary";
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  description,
  confirmLabel = "Confirm",
  confirmText,
  cancelLabel = "Cancel",
  typeToConfirm,
  confirmPhrase,
  variant = "danger",
  danger,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const handleCancel = onClose ?? onCancel ?? (() => {});
  const displayMessage = description ?? message ?? "";
  const finalConfirmLabel = confirmText ?? confirmLabel;
  const finalTypeToConfirm = confirmPhrase ?? typeToConfirm;
  const isDanger = danger !== undefined ? danger : variant === "danger";

  useEffect(() => {
    if (!isOpen) {
      setTyped("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  const canConfirm = !finalTypeToConfirm || typed.trim().toLowerCase() === finalTypeToConfirm.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {displayMessage && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{displayMessage}</p>}

        {finalTypeToConfirm && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type <strong className="font-semibold text-red-600 dark:text-red-400">{finalTypeToConfirm}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={finalTypeToConfirm}
              className="w-full h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-gray-700 dark:text-white"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canConfirm || loading}
            onClick={onConfirm}
            className={`h-10 rounded-lg px-4 text-sm font-medium text-white transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Processing..." : finalConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
