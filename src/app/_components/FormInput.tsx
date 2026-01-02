'use client';

import { ComponentProps, forwardRef, ReactNode } from "react";
interface InputProps extends ComponentProps<'input'> {
  label: string;
  icon?: ReactNode;
};

export const FormInput = forwardRef<HTMLInputElement, InputProps>(function FormInput(
  { label, icon, className, id, ...props },
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
        className={`${className ?? "w-full"} rounded-lg px-4 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none`}
      />
    </div>
  );
});