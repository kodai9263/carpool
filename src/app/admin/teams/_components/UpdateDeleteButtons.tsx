interface UpdateDeleteButtonsProps {
  onUpdate: () => void;
  onDelete: () => void;
  isSubmitting?: boolean;
}

export const UpdateDeleteButtons: React.FC<UpdateDeleteButtonsProps> = ({
  onUpdate,
  onDelete,
  isSubmitting = false,
}) => {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      <button
        type="submit"
        onClick={onUpdate}
        disabled={isSubmitting}
        className="app-button-primary w-full"
      >
        {isSubmitting ? "更新中..." : "更新"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isSubmitting}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-500/20 bg-gradient-to-br from-red-500 to-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(220,38,38,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(220,38,38,0.22)] focus:outline-none focus:ring-4 focus:ring-red-600/20 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-sm"
      >
        削除
      </button>
    </div>
  );
}
