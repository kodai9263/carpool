"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { FormButton } from "@/app/_components/FormButton";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm, FormProvider } from "react-hook-form";
import RideBasicInfo from "../_components/RideBasicInfo";
import AvailabilityFormList from "./_components/AvailabilityFormList";
import { AvailabilityListFormValues } from "@/app/_types/availability";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";
import { useAvailabilityMembers } from "@/app/member/_hooks/useAvailabilityMembers";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";

export default function Page() {
  const { teamId, rideId } = useParams<{ teamId: string; rideId: string }>();
  const router = useRouter();

  // メンバー認証用のPINとAPIリクエスト用のURLを取得
  const { pin, url } = useMemberRideAuth(teamId, rideId);

  const fetcher = usePinFetcher();
  const { data, error, isLoading, mutate } = useSWR<RideDetailResponse>(
    url,
    fetcher
  );

  const methods = useForm<AvailabilityListFormValues>({
    defaultValues: {
      availabilities: [{ memberId: 0, availability: false, seats: 1 }],
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
    register,
    setError,
    clearErrors,
  } = methods;

  // チームメンバーリストと、既に配車可否を登録済みのメンバーIDを取得
  const { members, registeredMemberIds, existingAvailabilities } =
    useAvailabilityMembers(data?.ride);

  const onSubmit = async (formData: AvailabilityListFormValues) => {
    if (!pin) return;

    // バリデーション
    let hasError = false;
    clearErrors();

    formData.availabilities.forEach((driver, index) => {
      if (driver.memberId === 0) {
        setError(`availabilities.${index}.memberId`, {
          type: "manual",
          message: "保護者を選択してください",
        });
        hasError = true;
      }

      // 配車可チェックのバリデーション
      // - 新規登録の場合: 配車可チェック必須
      // - 既存が不可の場合: 配車可チェック必須（不可→不可の無意味な送信を防ぐ）
      // - 既存が可の場合: 不可への変更を許可（確認ダイアログで対応）
      const memberIdNum = Number(driver.memberId);
      const existingData = existingAvailabilities.get(memberIdNum);
      const isNewOrWasUnavailable = !existingData || !existingData.availability;

      if (isNewOrWasUnavailable && memberIdNum !== 0 && !driver.availability) {
        setError(`availabilities.${index}.availability`, {
          type: "manual",
          message: "配車可にチェックしてください",
        });
        hasError = true;
      }
    });

    if (hasError) return;

    const changingToUnavailable = formData.availabilities.filter((driver) => {
      if (driver.memberId === 0) return false;
      const existingData = existingAvailabilities.get(driver.memberId);
      return existingData && existingData.availability && !driver.availability;
    });

    if (changingToUnavailable.length > 0) {
      const names = changingToUnavailable
        .map((d) => members.find((m) => m.id === d.memberId)?.name)
        .filter(Boolean)
        .join("、");

      if (!confirm(`${names}さんの配車を「不可」に変更しますか？`)) {
        return;
      }
    }

    try {
      // 各保護者のデータを個別に送信
      for (const driver of formData.availabilities) {
        await fetch(
          `/api/member/teams/${teamId}/rides/${rideId}/availability`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-pin": pin,
            },
            body: JSON.stringify(driver),
          }
        );
      }

      alert("配車可否を送信しました");
      mutate(); // データを再取得
      router.push(`/member/teams/${teamId}/rides/${rideId}`);
    } catch (e: unknown) {
      console.error(e);
      alert("送信中にエラーが発生しました");
    }
  };

  if (!teamId || !rideId) return <LoadingSpinner />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>エラーが発生しました。</div>;
  if (!data) return <div>データの取得に失敗しました。</div>;
  if (!data.ride) return <div>配車が見つかりません。</div>;

  const ride = data.ride;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 md:py-10 px-4">
      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-lg p-4 md:p-8">
        <h1 className="text-3xl font-bold text-center mb-8">🚗 配車可否</h1>

        <div className="space-y-8">
          <RideBasicInfo date={ride.date} destination={ride.destination} />

          <FormProvider {...methods}>
            <form onSubmit={(e) => { console.log("Form submit triggered"); handleSubmit(onSubmit, (errors) => console.log("Form validation errors:", errors))(e); }} className="space-y-6">
              <AvailabilityFormList
                members={members}
                registeredMemberIds={registeredMemberIds}
                existingAvailabilities={existingAvailabilities}
                register={register}
                control={control}
              />

              <FormButton
                label="送信"
                type="submit"
                isSubmitting={isSubmitting}
                loadingLabel="送信中..."
                className="!w-full !max-w-[240px] py-3 text-base"
              />
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
