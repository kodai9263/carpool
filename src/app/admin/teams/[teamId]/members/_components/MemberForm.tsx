'use client';

import { FormButton } from "@/app/_components/FormButton";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/member"; 
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { api } from "@/utils/api";
import { Baby, Plus, User, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";

export default function MemberForm() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    control
  } = useForm<MemberFormValues>({
    defaultValues: {
      guardians: [{ name: '' }],
      children: [{ name: '', grade: undefined }],
    },
  });

  // 保護者フィールド
  const { fields: guardianFields, append: appendGuardian, remove: removeGuardian } = useFieldArray({
    control,
    name: "guardians",
  });

  // 子供フィールド
  const { fields: childFields, append: appendChild, remove: removeChild } = useFieldArray({
    control,
    name: "children",
  });

  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const router = useRouter();
  const { data: teamData } = useFetch<TeamDetailResponse>(`/api/admin/teams/${teamId}`);

  const onSubmit = async (data: MemberFormValues) => {
    if (!token) return;

    try {
      await api.post<MemberFormValues>(
        `/api/admin/teams/${teamId}/members`,
        data,
        token,
      );

      router.push(`/admin/teams/${teamId}/members`);
      toast.success('メンバーを登録しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('登録中にエラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      {/* 保護者フィールド */}
      <div className="space-y-3">
        {guardianFields.map((guardian, index) => (
          <div key={guardian.id}>
            <label className="block text-sm font-medium flex items-center gap-2 mb-2">
              <User size={18} className="text-gray-500" />
              保護者 {index + 1}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 min-w-0 rounded-lg px-4 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none"
                {...register(`guardians.${index}.name` as const, { required: "保護者名を入力してください" })}
                disabled={isSubmitting}
              />
              {guardianFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGuardian(index)}
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition flex-shrink-0"
                  disabled={isSubmitting}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            {errors.guardians?.[index]?.name && (
              <p className="mt-1 text-sm text-red-500">{errors.guardians[index]?.name?.message}</p>
            )}
          </div>
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => appendGuardian({ name: '' })}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex-shrink-0"
            disabled={isSubmitting}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* 子供フィールド */}
      <div className="space-y-3">
        {childFields.map((child, index) => (
          <div key={child.id}>
            <label className="block text-sm font-medium flex items-center gap-2 mb-2">
              <Baby size={18} className="text-gray-500" />
              子供 {index + 1}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 min-w-0 rounded-lg px-4 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none"
                {...register(`children.${index}.name` as const)}
                disabled={isSubmitting}
              />
              <select
                className="w-20 rounded-lg px-2 py-2 border-2 border-gray-300 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none text-sm"
                {...register(`children.${index}.grade` as const, { valueAsNumber: true })}
                disabled={isSubmitting}
              >
                <option value="">学年</option>
                {teamData?.team.maxGrade === 6 ?
                  [1, 2, 3, 4, 5, 6].map((g) => (
                    <option key={g} value={g}>{g}年</option>
                  )) :
                  [1, 2, 3].map((g) => (
                    <option key={g} value={g}>{g}年</option>
                  ))
                }
              </select>
              {childFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeChild(index)}
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition flex-shrink-0"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => appendChild({ name: '', grade: undefined })}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex-shrink-0"
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
