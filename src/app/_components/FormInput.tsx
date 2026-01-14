'use client';

import { ComponentProps, forwardRef, ReactNode } from "react";
interface InputProps extends ComponentProps<'input'> {
  label: string;
  icon?: ReactNode;
  error?: string;
};

export const FormInput = forwardRef<HTMLInputElement, InputProps>(function FormInput(
  { label, icon, className, id, error, ...props },
  ref
) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium flex items-center gap-2 mb-2">
        {icon && <span className="text-gray-500">{icon}</span>}
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        {...props}
        className={`${className ?? "w-full"} rounded-lg px-4 py-2 border-2 ${error ? "border-red-500" : "border-gray-300"} focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
});