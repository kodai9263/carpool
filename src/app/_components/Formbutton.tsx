interface FormButtonProps {
  label: string;
  loadingLabel?: string;
  isSubmitting?: boolean;
  onClick?: () => void;
}

export const FormButton: React.FC<FormButtonProps> = ({
  label,
  loadingLabel = "送信中...",
  isSubmitting = false,
  onClick,
}) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        disabled={isSubmitting}
        className="w-[160px]  bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
      >
        {isSubmitting ? loadingLabel : label}
      </button>
    </div>
    
  );
};