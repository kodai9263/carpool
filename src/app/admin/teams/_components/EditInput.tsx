import { ComponentProps, forwardRef, ReactNode } from "react";

interface InputProps extends ComponentProps<'input'> {
  label: string;
  icon?: ReactNode;
  right?: React.ReactNode;
  hasValue?: boolean;
  error?: string;
  errorClassName?: string;
};

export const EditInput = forwardRef<HTMLInputElement, InputProps>(function EditInput(
  { label, icon, className, right, hasValue = false, error, errorClassName, ...props },
  ref
) {
  const bgColor = hasValue ? "bg-blue-50" : "bg-white";

  return (
    <div className="w-full">
      {/* モバイル: 縦並び */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
          <h2 className="text-sm font-bold">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            {...props}
            className={`flex-1 min-w-0 ${bgColor} rounded-lg px-3 py-2 border-2 ${error ? "border-red-500" : "border-gray-300"} focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none text-center transition-colors duration-200`}
          />
          {right}
        </div>
      </div>
      {/* デスクトップ: 横並び */}
      <div className="hidden md:flex items-center gap-3">
        {icon && <span className="text-gray-500 flex-shrink-0">{icon}</span>}
        <h2 className="text-base font-bold whitespace-nowrap flex-shrink-0 w-28">{label}</h2>
        <input
          ref={ref}
          {...props}
          className={`${className ?? "flex-1"} min-w-0 ${bgColor} rounded-lg px-4 py-2 border-2 ${error ? "border-red-500" : "border-gray-300"} focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none text-center transition-colors duration-200`}
        />
        {right}
      </div>
      {error && <p className={`mt-1 text-sm text-red-500 ${errorClassName ?? ''}`}>{error}</p>}
    </div>
  );
});