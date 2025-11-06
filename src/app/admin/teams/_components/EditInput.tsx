import { ComponentProps, forwardRef } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";

interface InputProps extends ComponentProps<'input'> {
  label: string;
  right?: React.ReactNode;
};

export const EditInput = forwardRef<HTMLInputElement, InputProps>(function EditInput(
  { label, className, id, right, ...props },
  ref
) {
  const inputId = id ?? (typeof props.name === 'string' ? props.name : undefined);

  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-bold whitespace-nowrap">{label}</h2>
      <input
        ref={ref}
        {...props}
        className={`${className ?? "w-full"} border border-gray-400 rounded px-2 py-1 mt-1 text-center`}
      />
      {right}
    </div>
  );
});