'use client';

import { ComponentProps } from "react";

interface FormButtonProps extends ComponentProps<'button'> {
  label: string;
  loadingLabel?: string;
  isSubmitting?: boolean;
  className?: string;
}

export const FormButton: React.FC<FormButtonProps> = ({
  label,
  loadingLabel = "送信中...",
  isSubmitting = false,
  type = "submit",
  className,
  ...props
}) => {
  return (
    <div className="flex justify-center">
      <button
        {...props}
        type={type}
        disabled={isSubmitting}
        className={`${className} w-[160px]  bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors`}
      >
        {isSubmitting ? loadingLabel : label}
      </button>
    </div>
    
  );
};