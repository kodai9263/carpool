import { ComponentProps } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";

interface InputProps extends ComponentProps<'input'> {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  rules?: RegisterOptions;
  right?: React.ReactNode;
};

export const EditInput: React.FC<InputProps> = ({
  label,
  name,
  register,
  rules,
  className,
  right,
  ...props
}) => {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-bold whitespace-nowrap">{label}</h2>
      <input
        {...props}
        {...register(name, rules)}
        className={`${className ?? "w-full"} border border-gray-400 rounded px-2 py-1 mt-1 text-center`}
      />
      {right}
    </div>
  );
};