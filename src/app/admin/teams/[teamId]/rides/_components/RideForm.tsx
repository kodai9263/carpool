'use client';

import { FormButton } from "@/app/_components/FormButton";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { RideFormValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import RideBasicForm from "./RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import toast from "react-hot-toast";

export default function RideForm() {
  const methods = useForm<RideFormValues>({
    defaultValues: { date: null, destination: '' },
    mode: 'onSubmit',
  });

  const { validateDate, handleDateChange } = createRideDateValidation(methods);

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    watch
  } = methods;

  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const router = useRouter();
  const date = watch('date');

  const onSubmit = async (data: RideFormValues) => {
    if (!validateDate()) return;
    if (!token) return;

    try {
      await api.post<RideFormValues>(
        `/api/admin/teams/${teamId}/rides`,
        data,
        token,
      );

      router.push(`/admin/teams/${teamId}/rides`);
      toast.success('配車を作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center max-w-xl mx-auto">
        <RideBasicForm
          date={date}
          onDateChange={handleDateChange}
          error={!!errors.date}
        />

        <FormButton
          label="登録"
          loadingLabel="登録中..."
          isSubmitting={isSubmitting}
        />
      </form>
    </FormProvider>
  );
}
