'use client';

import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/Team";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form";

export default function TeamForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<TeamFormValues>({
    defaultValues: { teamName: '', teamCode: '' }
  });

  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;

    try {
      const { id } = await api.post(
        '/api/admin/teams',
        { teamName: data.teamName, teamCode: data.teamCode },
        token,
      );

      router.push(`/admin/teams/${id}/rides`);
      alert('チームを作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label 
          htmlFor="teamCode"
          className="block text-sm font-medium mb-2"
        >
          チームID
        </label>
        <input 
          type="text"
          id="teamCode"
          className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
          {...register("teamCode", { required: true })}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label 
          htmlFor="teamName"
          className="block text-sm font-medium mb-2"
        >
          チーム名
        </label>
        <input 
          type="text"
          id="teamName"
          className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
          {...register("teamName", { required: true })}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
        >
          {isSubmitting ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  );
}