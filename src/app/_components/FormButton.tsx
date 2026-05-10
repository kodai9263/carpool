'use client';

import { ComponentProps } from "react";
import { Loader2 } from "lucide-react";

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
    <div className="flex w-full justify-center">
      <button
        {...props}
        type={type}
        disabled={isSubmitting}
        className={`app-button-primary mt-2 ${className ?? "w-full sm:w-[180px]"}`}
      >
        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
        {isSubmitting ? loadingLabel : label}
      </button>
    </div>
    
  );
};
