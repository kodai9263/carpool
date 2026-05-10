import { ComponentProps, forwardRef, ReactNode } from "react";

interface InputProps extends ComponentProps<"input"> {
  label: string;
  icon?: ReactNode;
  right?: React.ReactNode;
  hasValue?: boolean;
  error?: string;
  errorClassName?: string;
}

export const EditInput = forwardRef<HTMLInputElement, InputProps>(
  function EditInput(
    {
      label,
      icon,
      className,
      right,
      hasValue = false,
      error,
      errorClassName,
      ...props
    },
    ref
  ) {
    const bgColor = hasValue ? "bg-teal-50/70" : "bg-white";

    return (
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:flex-shrink-0">
            {icon && (
              <span className="text-gray-500 flex-shrink-0">{icon}</span>
            )}
            <h2 className="text-sm font-semibold text-gray-700 md:w-28 md:whitespace-nowrap">
              {label}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <input
              ref={ref}
              {...props}
              className={`${
                className ?? "flex-1"
              } min-w-0 ${bgColor} rounded-lg px-3 md:px-4 py-3 border ${
                error ? "border-red-500" : "border-gray-300"
              } focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 focus:outline-none text-left transition-colors duration-200`}
            />
            {right}
          </div>
        </div>
        {error && (
          <p className={`mt-1 text-sm text-red-500 ${errorClassName ?? ""}`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);
