'use client';

import { ComponentProps, forwardRef } from "react";
interface InputProps extends ComponentProps<'input'> {
  label: string;
};

export const FormInput = forwardRef<HTMLInputElement, InputProps>(function FormInput(
  { label, className, id, ...props },
  ref
) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined);

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium mb-2">
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