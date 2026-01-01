'use client';

import { FormButton } from "@/app/_components/FormButton";
import { FormInput } from "@/app/_components/FormInput";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/member";
import { api } from "@/utils/api";
import { Plus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";

export default function MemberForm() {
  const { register, handleSubmit, formState: { isSubmitting }, control } = useForm<MemberFormValues>({
    defaultValues: {
      name: '',
      children: [{ name: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "children",
  });

  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: MemberFormValues) => {
    if (!token) return;

    try {
      await api.post<MemberFormValues>(
        `/api/admin/teams/${teamId}/members`,
        data,
        token,
      );

      router.push(`/admin/teams/${teamId}/members`);
      alert('メンバーを登録しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('登録中にエラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center max-w-md mx-auto">
      <FormInput 
        label="メンバー名（保護者 or 指導者）"
        disabled={isSubmitting}
        {...register("name", { required: "メンバー名を入力してください。"})}
      />
      
      <div className="w-full">
        <label className="block text-sm font-medium mb-2">
          お子さんの名前
        </label>

        <div className="space-y-3">
          {fields.map((child, index) => (
            <div key={child.id} className="flex items-center gap-2">
              <input 
                type="text"
                className="w-full rounded-lg px-4 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none"
                {...register(`children.${index}.name` as const)}
                disabled={isSubmitting}
              />
              <button 
                type="button"
                onClick={() => remove(index)}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
              >
                <X size={24} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => append({ name: '' })}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition mt-4"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <FormButton
        label="登録"
        loadingLabel="登録中..."
        isSubmitting={isSubmitting}
        className="!w-[400px] py-3 text-base"
      />
    </form>
  )
}