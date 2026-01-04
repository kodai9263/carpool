'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { UpdateRideValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import RideBasicForm from "../_components/RideBasicForm";
import RideDriverList from "../_components/RideDriverList";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { convertRideDetailToFormValues } from "@/utils/rideConverter";

export default function Page() {
  const methods = useForm<UpdateRideValues>({
    defaultValues: {
      destination: '',
      drivers: [],
    },
  });
  const { handleSubmit, formState: { isSubmitting }, reset, setValue, watch, control } = methods;

  const date = watch("date");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "drivers",
  });

  const params = useParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const { token } = useSupabaseSession();
  const router = useRouter();

  const { data, error, isLoading } = useFetch(`/api/admin/teams/${teamId}/rides/${rideId}`);

  useEffect(() => {
    if (data?.ride) {
      const formValues = convertRideDetailToFormValues(data.ride);
      // 各ドライバーの空の行を削除
      formValues.drivers = formValues.drivers.map(driver => ({
        ...driver,
        rideAssignments: driver.rideAssignments.filter(child => child.childId !== 0)
      }));
      reset(formValues);
    }
  }, [data, reset]);

  const onSubmit = async (data: UpdateRideValues) => {
    if (!token) return;

    // 配車情報更新
    try {
      await api.put<UpdateRideValues>(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        data,
        token
      );
      alert('配車詳細を更新しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('更新中にエラーが発生しました。');
    }
  }

  // 配車削除
  const handleDeleteRide = async () => {
    if (!confirm('配車を削除しますか？')) return;
    if (!token) return;
    try {
      await api.delete(`/api/admin/teams/${teamId}/rides/${rideId}`, token);
      alert('配車を削除しました。');
      router.replace(`/admin/teams/${teamId}/rides`);
    } catch (e: unknown) {
      console.error(e);
      alert('削除中にエラーが発生しました。');
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <div className="w-full max-w-[1000px] bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">🚗 配車詳細</h1>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex justify-center">
              <RideBasicForm setValue={setValue} date={date} />
            </div>
          
            <RideDriverList 
              drivers={fields}
              availabilityDrivers={data?.ride?.availabilityDrivers ?? []}
              childrenList={data?.ride?.children ?? []}
              appendDriver={() => append({ availabilityDriverId: 0, seats: 0, rideAssignments: [] })}
              removeDriver={remove}
            />

            <UpdateDeleteButtons 
              onUpdate={handleSubmit(onSubmit)}
              onDelete={handleDeleteRide}
              isSubmitting={isSubmitting}
            />
          </form>
        </FormProvider>
      </div>
    </div>
  );
}