"use client";

import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  id,
  error,
  hint,
  required,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  hint,
  description,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  hint?: string;
  description?: string;
  disabled?: boolean;
}) {
  const displayHint = description ?? hint;
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer py-1">
      <div>
        <span className="text-sm font-medium text-gray-900 dark:text-white block">
          {label}
        </span>
        {displayHint && (
          <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">
            {displayHint}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
