'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { MessageSquarePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { FormButton } from "./FormButton";

const CATEGORIES = ["改善要望", "バグ報告", "使ってみたい機能", "その他"] as const;
type Category = typeof CATEGORIES[number];

interface FeedbackFormValues {
  category: Category;
  message: string;
}

export const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackFormValues>({
    defaultValues: { category: "改善要望", message: "" },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { message?: string }).message ?? "送信に失敗しました");
      }

      toast.success("フィードバックを送信しました。ありがとうございます！");
      reset();
      setIsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "送信に失敗しました");
    }
  };

  const handleClose = () => {
    reset();
    setIsOpen(false);
  };

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="フィードバックを送る"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40
                   flex items-center gap-2 bg-teal-700 hover:bg-teal-800
                   text-white text-sm font-medium
                   px-4 py-3 rounded-full shadow-lg
                   transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">フィードバック</span>
      </button>

      {/* オーバーレイ + モーダル */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          {/* バックドロップ */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          {/* モーダル本体 */}
          <div className="relative w-full sm:max-w-md mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-5">
              <h2 id="feedback-modal-title" className="text-lg font-bold text-gray-800">
                フィードバックを送る
              </h2>
              <button
                onClick={handleClose}
                aria-label="閉じる"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* カテゴリ選択 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border-2 border-gray-200 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50 transition-colors"
                    >
                      <input
                        type="radio"
                        value={cat}
                        {...register("category", { required: true })}
                        className="sr-only"
                      />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* メッセージ */}
              <div className="mb-2">
                <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-2">
                  メッセージ <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  placeholder="ご意見・ご要望をお聞かせください"
                  {...register("message", {
                    required: "メッセージを入力してください",
                    maxLength: { value: 1000, message: "1000文字以内で入力してください" },
                    validate: (v) => v.trim().length > 0 || "メッセージを入力してください",
                  })}
                  className={`w-full rounded-lg px-4 py-2 border-2 resize-none
                    ${errors.message ? "border-red-500" : "border-gray-300"}
                    focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none`}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>
                )}
              </div>

              <FormButton label="送信する" loadingLabel="送信中..." isSubmitting={isSubmitting} />
            </form>
          </div>
        </div>
      )}
    </>
  );
};
