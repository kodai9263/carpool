import { RegisterOptions, UseFormRegister } from "react-hook-form";

interface Props {
  label: string;
  name: string;
  type?: string;
  disabled?: boolean;
  register: UseFormRegister<any>;
  rules?: RegisterOptions;
  className?: string;
  right?: React.ReactNode;
};

export const EditInput: React.FC<Props> = ({
  label,
  name,
  type = "text",
  disabled,
  register,
  rules,
  className,
  right,
}) => {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-lg font-bold whitespace-nowrap">{label}</h2>
      <input
        {...register(name, rules)}
        type={type}
        disabled={disabled}
        className={`border border-gray-400 rounded px-2 py-1 mt-1 w-full text-center ${className}`}
      />
      {right}
    </div>
  );
};