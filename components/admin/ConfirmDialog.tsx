"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Input } from "./AdminPrimitives";

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
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // React official pattern: adjust state during rendering without useEffect
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setTyped("");
    }
  }

  const handleCancel = useCallback(() => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  }, [onClose, onCancel]);

  const displayMessage = description ?? message ?? "";
  const finalConfirmLabel = confirmText ?? confirmLabel;
  const finalTypeToConfirm = confirmPhrase ?? typeToConfirm;
  const isDanger = danger !== undefined ? danger : variant === "danger";

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
      className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-[f-fadein_.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-2xl border border-hairline bg-card p-6 shadow-2xl animate-[f-modalin_.25s_var(--ease)] text-ink"
      >
        <h3 id="confirm-dialog-title" className="text-ctitle font-semibold text-ink">
          {title}
        </h3>
        {displayMessage && <p className="mt-2 text-cell text-mute">{displayMessage}</p>}

        {finalTypeToConfirm && (
          <div className="mt-4">
            <label className="block text-meta font-medium text-ink mb-1.5">
              Type <strong className="font-semibold text-down">{finalTypeToConfirm}</strong> to confirm:
            </label>
            <Input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={finalTypeToConfirm}
              className="w-full"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" disabled={loading} onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            disabled={!canConfirm || loading}
            loading={loading}
            onClick={onConfirm}
          >
            {finalConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
