'use client';

import { FormButton } from "@/app/_components/FormButton";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { RideFormValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import RideBasicForm from "./RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import toast from "react-hot-toast";

export default function RideForm() {
  // 複製時はURLパラメータから行き先・集合場所を引き継ぐ（日付は必ず選び直す）
  const searchParams = useSearchParams();
  const prefilledDestination = searchParams.get("destination") ?? "";
  const prefilledMeetingPlace = searchParams.get("meetingPlace") ?? "";
  const isDuplicated = Boolean(prefilledDestination || prefilledMeetingPlace);

  const methods = useForm<RideFormValues>({
    defaultValues: {
      date: null,
      destination: prefilledDestination,
      meetingPlace: prefilledMeetingPlace,
    },
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
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex max-w-xl flex-col space-y-6">
        {isDuplicated && (
          <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-800">
            前回の配車から行き先・集合場所を引き継いでいます。日付を選んで登録してください。
          </p>
        )}
        <div data-guide="admin-new-ride-basic">
          <RideBasicForm
            date={date}
            onDateChange={handleDateChange}
            error={!!errors.date}
          />
        </div>

        <div data-guide="admin-new-ride-submit">
          <FormButton
            label="登録"
            loadingLabel="登録中..."
            isSubmitting={isSubmitting}
          />
        </div>
      </form>
    </FormProvider>
  );
}
