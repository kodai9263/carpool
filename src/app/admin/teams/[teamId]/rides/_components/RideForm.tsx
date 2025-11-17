'use client';

import { FormButton } from "@/app/_components/Formbutton";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { RideFormValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { Calendar, MapPin } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export default function RideForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<RideFormValues>({
    defaultValues: { date: '', destination: '' },
  });

  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: RideFormValues) => {
    if (!token) return;

    try {
      await api.post<RideFormValues>(
        `/api/admin/teams/${teamId}/rides`,
        data,
        token,
      );

      router.push(`admin/teams/${teamId}/rides`);
      alert('配車を作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
      <div className="px-10 py-8 rounded bg-white space-y-12 shadow-sm w-[480px] ml-[-72px]">
        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><Calendar size={28} /></div>
          <span className="w-20 text-xl">日付</span>

          <input 
            type="date"
            {...register("date", { required: "日付を選択してください。" })}
            className="border border-gray-300 rounded px-3 py-3 flex-1"
          />
        </div>

        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><MapPin size={28} /></div>
          <span className="w-20 text-xl">行き先</span>

          <input
            type="text"
            {...register("destination", { required: true })}
            className="border border-gray-300 rounded px-3 py-3 flex-1"/>
        </div>
      </div>

      <FormButton 
        label="登録"
        loadingLabel="登録中..."
        isSubmitting={isSubmitting}
      />
    </form>
  );
}