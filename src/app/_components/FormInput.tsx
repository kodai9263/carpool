import { RegisterOptions, UseFormRegister } from "react-hook-form";

interface Props {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  register: UseFormRegister<any>;
  rules?: RegisterOptions;
  className?: string;
};

export const FormInput: React.FC<Props> = ({
  label,
  name,
  type = "text",
  placeholder,
  disabled,
  register,
  rules,
  className,
}) => {
  const widthClass = className ?? "w-full";
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <input 
        {...register(name, rules)}
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        disabled={disabled}
        className={`${widthClass} rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]`}
        />
    </div>
  );
};