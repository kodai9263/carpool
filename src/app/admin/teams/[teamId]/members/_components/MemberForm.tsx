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
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-8">
      {/* 保護者フィールド */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4" data-guide="admin-new-member-guardians">
        <div>
          <h2 className="text-base font-bold text-gray-950">保護者</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            ドライバーと引率者を別々に選びたい場合は、「＋」で父・母などを分けて登録してください。
          </p>
        </div>
        {guardianFields.map((guardian, index) => (
          <div key={guardian.id}>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User size={18} className="text-gray-500" />
              保護者 {index + 1}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="app-input min-w-0 flex-1"
                {...register(`guardians.${index}.name` as const, { required: "保護者名を入力してください" })}
                disabled={isSubmitting}
              />
              {guardianFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGuardian(index)}
                  className="app-icon-button flex-shrink-0"
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
            className="app-button-secondary px-3"
            disabled={isSubmitting}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* 子供フィールド */}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4" data-guide="admin-new-member-children">
        <h2 className="text-base font-bold text-gray-950">子ども</h2>
        {childFields.map((child, index) => (
          <div key={child.id}>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Baby size={18} className="text-gray-500" />
              子供 {index + 1}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="app-input min-w-0 flex-1"
                {...register(`children.${index}.name` as const)}
                disabled={isSubmitting}
              />
              <select
                className="app-select w-24 text-sm"
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
                  className="app-icon-button flex-shrink-0"
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
            className="app-button-secondary px-3"
            disabled={isSubmitting}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex justify-center mt-8" data-guide="admin-new-member-submit">
        <FormButton
          label="登録"
          loadingLabel="登録中..."
          isSubmitting={isSubmitting}
          className="w-full"
        />
      </div>
    </form>
  )
}
