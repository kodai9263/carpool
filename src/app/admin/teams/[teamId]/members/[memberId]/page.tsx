'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { MemberFormValues } from "@/app/_types/Member";
import { api } from "@/utils/api";
import { Plus, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { EditInput } from "../../../_components/EditInput";

export default function Page() {
  const  { register, handleSubmit, formState: { isSubmitting }, reset, control } = useForm<MemberFormValues>({
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
      console.log(e);
      alert('削除中にエラーが発生しました。')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8 mt-10">メンバー詳細</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center space-y-886">
        <div className="bg-white p-6 rounded-xl shadow-md w-[400px] space-y-8">
          <EditInput 
            label="大人 名前"
            disabled={isSubmitting}
            {...register("name", { required: true })}
            className="w-[187px] ml-[16px]"
          />

          {fields.map((child, index) => (
            <EditInput 
              key={child.id}
              label={`子供 名前 ${index + 1}`}
              {...register(`children.${index}.name`, { required: true })}
              disabled={isSubmitting}
              right={
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 transition"
                  disabled={isSubmitting}
                >
                  <X size={24} />
                </button>
              }
            />
          ))}
        
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => append({ name: ""})}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              disabled={isSubmitting}
            >
              <Plus size={24} />
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
  );
}