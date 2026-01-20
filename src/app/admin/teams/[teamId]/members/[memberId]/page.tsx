'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/member";
import { api } from "@/utils/api";
import { Baby, Plus, Users, X } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { EditInput } from "../../../_components/EditInput";

export default function Page() {
  const  { 
    register, 
    handleSubmit, 
    formState: { isSubmitting, errors },
    reset, 
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

  const params = useParams<{ teamId: string; memberId: string }>();
  const teamId = params.teamId;
  const memberId = params.memberId;
  const { token } = useSupabaseSession();
  const router = useRouter();

  const  { data, error, isLoading } = useFetch(`/api/admin/teams/${teamId}/members/${memberId}`);

  // 値を監視
  const memberName = useWatch({ control, name: "name" });
  const childrenNames = useWatch({ control, name: "children" });

  // 既存内容を表示
  useEffect(() => {
    if (data?.member) {
      reset({
        name: data.member.name,
        children: (data.member.children ?? []).map((child: { name: string }) => ({
          name: child.name,
        })),
      });
    }
  }, [data, reset]);

  const onSubmit = async (data: MemberFormValues) => {
    if (!token) return;
  
    // メンバー情報更新
    try {
      await api.put<MemberFormValues>(
        `/api/admin/teams/${teamId}/members/${memberId}`,
        data,
        token,
      );

      alert('メンバー詳細を更新しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('更新中にエラーが発生しました。');
    }
  }

  // チーム削除
  const handleDeleteMember = async () => {
    if (!confirm('メンバーを削除しますか？')) return;
    if (!token) return;

    try {
      await api.delete(`/api/admin/teams/${teamId}/members/${memberId}`, token);
      alert('メンバーを削除しました。');

      router.replace(`/admin/teams/${teamId}/members`);
    } catch (e: unknown) {
      console.error(e);
      alert('削除中にエラーが発生しました。')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) {
    if (error.message?.includes('404') || error.status === 404) {
      notFound();
    }
  }

  return (
    <div className="flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <h1 className="text-3xl font-bold mb-8 text-center">👤 メンバー詳細</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <EditInput
            icon={<Users size={18} />}
            label="保護者/指導者"
            disabled={isSubmitting}
            hasValue={!!memberName && memberName.length > 0}
            error={errors.name?.message}
            errorClassName="text-center ml-16"
            {...register("name", { required: "メンバー名を入力してください。" })}
          />

          <div className="space-y-3">
            {fields.map((child, index) => (
              <EditInput
                key={child.id}
                icon={<Baby size={18} className="text-gray-500" />}
                label={`子供${index + 1}`}
                hasValue={!!childrenNames?.[index]?.name && childrenNames[index].name.length > 0}
                {...register(`children.${index}.name`, { required: true })}
                disabled={isSubmitting}
                right={
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition flex-shrink-0"
                    disabled={isSubmitting}
                  >
                    <X size={20} />
                  </button>
                }
              />
            ))}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => append({ name: ""})}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex-shrink-0"
                disabled={isSubmitting}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <UpdateDeleteButtons 
            onUpdate={handleSubmit(onSubmit)}
            onDelete={handleDeleteMember}
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </div>
  );
}