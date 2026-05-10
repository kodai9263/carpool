'use client';

import { ComponentProps, forwardRef, ReactNode } from "react";
interface InputProps extends ComponentProps<'input'> {
  label: string;
  icon?: ReactNode;
  error?: string;
  helperText?: string;
};

export const FormInput = forwardRef<HTMLInputElement, InputProps>(function FormInput(
  { label, icon, className, id, error, helperText, ...props },
  ref
) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined);

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={inputId && error ? `${inputId}-error` : inputId && helperText ? `${inputId}-helper` : undefined}
        {...props}
        className={`${className ?? "w-full"} app-input ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
      />
      {helperText && !error && <p id={inputId ? `${inputId}-helper` : undefined} className="mt-1.5 text-sm leading-5 text-gray-500">{helperText}</p>}
      {error && <p id={inputId ? `${inputId}-error` : undefined} className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
});
