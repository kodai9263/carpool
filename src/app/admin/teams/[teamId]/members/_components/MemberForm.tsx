'use client';

import { FormButton } from "@/app/_components/FormButton";
import { FormInput } from "@/app/_components/FormInput";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/member";
import { api } from "@/utils/api";
import { Baby, Plus, User, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";

export default function MemberForm() {
  const { 
    register, 
    handleSubmit, 
    formState: { isSubmitting, errors },
    control 
  } = useForm<MemberFormValues>({
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center max-w-xl mx-auto">
      <FormInput
        icon={<User size={18} />}
        label="メンバー名（保護者 or 指導者）"
        disabled={isSubmitting}
        error={errors.name?.message}
        {...register("name", { required: "メンバー名を入力してください。"})}
        className="w-[250px]"
      />
      
      <div className="space-y-3 ml-12">
        {fields.map((child, index) => (
          <div key={child.id}>
            <label className="block text-sm font-medium flex items-center gap-2 mb-2">
              <Baby size={18} className="text-gray-500" />
              お子さん {index + 1}人目
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                className="w-[250px] rounded-lg px-4 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none"
                {...register(`children.${index}.name` as const)}
                disabled={isSubmitting}
              />
              {fields.length > 1 ? (
                <button 
                  type="button"
                  onClick={() => remove(index)}
                  className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition flex-shrink-0"
                >
                  <X size={20} />
                </button>
              ) : (
                <div className="w-[40px]"></div>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => append({ name: '' })}
            className="px-3 py-2 mt-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex-shrink-0"
            disabled={isSubmitting}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <FormButton
          label="登録"
          loadingLabel="登録中..."
          isSubmitting={isSubmitting}
        />
      </div>
    </form>
  )
}