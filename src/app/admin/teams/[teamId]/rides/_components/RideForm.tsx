'use client';

import { FormButton } from "@/app/_components/FormButton";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { RideFormValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import RideBasicForm from "./RideBasicForm";

export default function RideForm() {
  const methods = useForm<RideFormValues>({
    defaultValues: { date: null, destination: '' },
  });
  const { handleSubmit, formState: { isSubmitting }, setValue, watch } = methods;

  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const router = useRouter();
  const date = watch('date');

  const onSubmit = async (data: RideFormValues) => {
    if (!token) return;

    try {
      await api.post<RideFormValues>(
        `/api/admin/teams/${teamId}/rides`,
        data,
        token,
      );

      router.push(`/admin/teams/${teamId}/rides`);
      alert('配車を作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex flex-col items-center">
        <RideBasicForm setValue={setValue} date={date} />
        
        <FormButton 
          label="登録"
          loadingLabel="登録中..."
          isSubmitting={isSubmitting}
          className="!w-[400px] py-3 text-base"
        />
      </form>
    </FormProvider>
  );
}