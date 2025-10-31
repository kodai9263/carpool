'use client';

import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/Member";
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
      await api.post(
        `/api/admin/teams/${teamId}/members`,
        { 
          memberName: data.name,
          children: data.children
            // 子供欄が空欄ならスキップ
            .filter((child) => child.name.trim() !== '')
            .map((child) => ({ childName: child.name }))},
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label 
          htmlFor="name"
          className="block text-sm font-medium mb-2"
        >
          メンバー名（保護者 or 指導者）
        </label>
        <input 
          type="text"
          id="name"
          className="w-[290px] rounded-lg px-4 py-2  border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
          {...register("name", { required: true })}
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">
          お子さんの名前
        </label>

        <div className="space-y-3">
          {fields.map((child, index) => (
            <div key={child.id} className="flex items-center gap-2">
              <input 
                type="text"
                className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
                {...register(`children.${index}.name` as const)}
                disabled={isSubmitting}
              />
              <button 
                type="button"
                onClick={() => remove(index)}
                className="text-gray-600 hover:text-red-400 transition"
              >
                <X size={24} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={() => append({ name: '' })}
            className="bg-white hover:bg-[#356963] hover:text-white transition ml-[-28px]"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-[120px] bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors ml-[-28px]"
        >
          {isSubmitting ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}