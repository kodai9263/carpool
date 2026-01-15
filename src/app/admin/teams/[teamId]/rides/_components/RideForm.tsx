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
    mode: 'onSubmit',
  });

  const validateDate = () => {
    if (!methods.getValues('date')) {
      methods.setError('date', { type: 'required', message: '日付を入力してください' });
      return false;
    }
    return true;
  };
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    setValue,
    watch
  } = methods;

  const handleDateChange = (date: Date | null) => {
    setValue('date', date);
    if (date) {
      methods.clearErrors('date');
    }
  };

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
      alert('配車を作成しました。');
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
          error={errors.date?.message}
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