"use client";

import type { ReactNode } from "react";
import { Field, Switch } from "./AdminPrimitives";

export interface FormFieldProps {
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
    <div className={className}>
      <Field label={label} hint={hint} error={error} required={required}>
        {children}
      </Field>
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
  return (
    <Switch
      label={label}
      description={description ?? hint}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
