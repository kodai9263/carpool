import { ComponentProps } from "react";
import { RegisterOptions, UseFormRegister } from "react-hook-form";

interface InputProps extends ComponentProps<'input'> {
  label: string;
  name: string;
  type?: string;
  register: UseFormRegister<any>;
  rules?: RegisterOptions;
};

export const FormInput: React.FC<InputProps> = ({
  label,
  name,
  register,
  rules,
  className,
  ...props
}) => {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-2">
        {label}
      </label>
      <input 
        {...props}
        {...register(name, rules)}
        id={name}
        name={name}
        className={`${className ?? "w-full"} rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]`}
        />
    </div>
  );
};