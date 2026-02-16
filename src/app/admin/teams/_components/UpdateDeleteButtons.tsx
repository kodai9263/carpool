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
    <div className="flex justify-center gap-6 mt-8">
      <button
        type="submit"
        onClick={onUpdate}
        disabled={isSubmitting}
        className="bg-green-700 text-white px-6 py-2 rounded-lg hover:bg-green-800 transition whitespace-nowrap"
      >
        {isSubmitting ? "更新中..." : "編集・更新"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isSubmitting}
        className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition whitespace-nowrap"
      >
        削除
      </button>
    </div>
  );
}