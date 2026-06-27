"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { FormButton } from "@/app/_components/FormButton";
import GuidedTour, { type GuidedTourStep } from "@/app/_components/GuidedTour";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import RideBasicInfo from "../_components/RideBasicInfo";
import AvailabilityFormList from "./_components/AvailabilityFormList";
import ChildAvailabilitySection from "./_components/ChildAvailabilitySection";
import { AvailabilityListFormValues } from "@/app/_types/availability";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";
import { useAvailabilityMembers } from "@/app/member/_hooks/useAvailabilityMembers";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";
import toast from "react-hot-toast";
import { useState, useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";

const availabilityGuideSteps = [
  {
    target: "member-availability-ride-info",
    title: "まず予定を確認します",
    body: "日付、行き先、集合場所を確認して、この配車に回答する内容か見てください。",
  },
  {
    target: "member-availability-guardian-form",
    title: "回答する保護者を選びます",
    body: "保護者名を選んで、車を出せる場合は「配車可」、引率できる場合は「引率可」を選びます。必要に応じて人数やコメントも入れられます。",
  },
  {
    target: "member-availability-child-status",
    title: "子どもの参加状況を選びます",
    body: "保護者を選ぶと、その家庭の子どもが表示されます。参加、自走、不参加のどれかを選んでください。",
  },
  {
    target: "member-availability-submit",
    title: "最後に回答を送信します",
    body: "内容を確認したら送信します。送信すると管理者が回答状況を確認できるようになります。",
  },
] satisfies GuidedTourStep[];

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
      availabilities: [{ guardianId: 0, driverAvailability: false, driverDirection: "both", seats: 1, driverComment: "", escortAvailability: false, escortDirection: "both", escortComment: "" }],
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    control,
    register,
    setError,
    clearErrors,
  } = methods;

  // 保護者リストと、既に配車・引率可否を登録済みの保護者IDを取得
  const { guardians, registeredGuardianIds, existingDriverAvailabilities, existingEscortAvailabilities } =
    useAvailabilityMembers(data?.ride);

  // 参加不可の子どもIDセット
  const [notParticipatingIds, setNotParticipatingIds] = useState<Set<number>>(new Set());
  // 自走の子どもIDセット
  const [selfDrivingIds, setSelfDrivingIds] = useState<Set<number>>(new Set());

  // 既存の childAvailabilities から初期化
  useEffect(() => {
    if (data?.ride?.childAvailabilities) {
      const notParticipating = new Set(
        data.ride.childAvailabilities
          .filter((ca) => !ca.availability)
          .map((ca) => ca.childId)
      );
      const selfDriving = new Set(
        data.ride.childAvailabilities
          .filter((ca) => ca.selfDriving)
          .map((ca) => ca.childId)
      );
      setNotParticipatingIds(notParticipating);
      setSelfDrivingIds(selfDriving);
    }
  }, [data]);

  const toggleNotParticipating = (childId: number) => {
    setNotParticipatingIds((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  const toggleSelfDriving = (childId: number) => {
    setSelfDrivingIds((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  };

  // フォームで選択済みの保護者（guardianId !== 0）を監視
  const watchedAvailabilities = useWatch({ control, name: "availabilities" });

  // 選択済み保護者のmemberIdを逆引きして子供のみ表示対象にする
  const visibleChildren = useMemo(() => {
    const guardianIdToMemberId = new Map(
      (data?.ride?.guardians ?? []).map((g) => [g.id, g.memberId])
    );
    const selectedGuardianIds = new Set(
      watchedAvailabilities
        .filter((a) => Number(a.guardianId) !== 0)
        .map((a) => Number(a.guardianId))
    );
    const relevantMemberIds = new Set(
      [...selectedGuardianIds]
        .map((gId) => guardianIdToMemberId.get(gId))
        .filter((id): id is number => id !== undefined)
    );
    return (data?.ride?.children ?? []).filter(
      (c) => c.memberId !== undefined && relevantMemberIds.has(c.memberId)
    );
  }, [data?.ride?.guardians, data?.ride?.children, watchedAvailabilities]);

  const onSubmit = async (formData: AvailabilityListFormValues) => {
    if (!pin) return;

    // バリデーション
    let hasError = false;
    clearErrors();

    formData.availabilities.forEach((driver, index) => {
      if (driver.guardianId === 0) {
        setError(`availabilities.${index}.guardianId`, {
          type: "manual",
          message: "保護者を選択してください",
        });
        hasError = true;
      }
    });

    if (hasError) return;

    // 配車を「不可」に変更する保護者
    const changingDriverToUnavailable = formData.availabilities.filter((driver) => {
      if (driver.guardianId === 0) return false;
      const existingData = existingDriverAvailabilities.get(driver.guardianId);
      return existingData && existingData.availability && !driver.driverAvailability;
    });

    // 引率を「不可」に変更する保護者
    const changingEscortToUnavailable = formData.availabilities.filter((driver) => {
      if (driver.guardianId === 0) return false;
      const existingData = existingEscortAvailabilities.get(driver.guardianId);
      return existingData && existingData.availability && !driver.escortAvailability;
    });

    if (changingDriverToUnavailable.length > 0) {
      const names = changingDriverToUnavailable
        .map((d) => guardians.find((g) => g.id === d.guardianId)?.name)
        .filter(Boolean)
        .join("、");
      if (!confirm(`${names}さんの配車を「不可」に変更しますか？`)) {
        return;
      }
    }

    if (changingEscortToUnavailable.length > 0) {
      const names = changingEscortToUnavailable
        .map((d) => guardians.find((g) => g.id === d.guardianId)?.name)
        .filter(Boolean)
        .join("、");
      if (!confirm(`${names}さんの引率を「不可」に変更しますか？`)) {
        return;
      }
    }

    // guardianId → memberId の逆引きマップ
    const guardianIdToMemberId = new Map(
      (data?.ride?.guardians ?? []).map((g) => [g.id, g.memberId])
    );

    try {
      // 各保護者のデータを個別に送信（子どもの参加可否を含める）
      for (const driver of formData.availabilities) {
        // 保護者のmemberIdを取得し、その家族の子ども一覧を絞り込む
        const memberIdForDriver = guardianIdToMemberId.get(driver.guardianId);
        const memberChildren = (data?.ride?.children ?? []).filter(
          (c) => c.memberId === memberIdForDriver
        );
        const childAvailabilities = memberChildren.map((child) => ({
          childId: child.id,
          availability: !notParticipatingIds.has(child.id),
          selfDriving: selfDrivingIds.has(child.id),
        }));

        await fetch(
          `/api/member/teams/${teamId}/rides/${rideId}/availability`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-pin": pin,
            },
            body: JSON.stringify({ ...driver, childAvailabilities }),
          }
        );
      }

      toast.success("配車・引率可否を送信しました");
      mutate(); // データを再取得
      router.push(`/member/teams/${teamId}/rides/${rideId}`);
    } catch (e: unknown) {
      console.error(e);
      setError("root", {
        type: "manual",
        message: "送信中にエラーが発生しました。時間をおいて再度お試しください。",
      });
    }
  };

  if (!teamId || !rideId) return <LoadingSpinner />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>エラーが発生しました。</div>;
  if (!data) return <div>データの取得に失敗しました。</div>;
  if (!data.ride) return <div>配車が見つかりません。</div>;

  const ride = data.ride;

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
      <div className="app-card p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">回答入力</p>
            <h1 className="app-section-title">配車・引率可否</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              保護者ごとの配車・引率可否と、子どもの参加状況をまとめて送信できます。
            </p>
          </div>
          <GuidedTour
            storageKey="member-availability-guided-tour:v1"
            steps={availabilityGuideSteps}
            autoStart
            className="app-button-secondary w-full shrink-0 sm:w-auto"
          />
        </div>

        <div className="space-y-8">
          <div data-guide="member-availability-ride-info">
            <RideBasicInfo
              date={ride.date}
              destination={ride.destination}
              meetingPlace={ride.meetingPlace}
            />
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {errors.root?.message && (
                <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p>{errors.root.message}</p>
                </div>
              )}
              <div data-guide="member-availability-guardian-form">
                <AvailabilityFormList
                  guardians={guardians}
                  registeredGuardianIds={registeredGuardianIds}
                  existingDriverAvailabilities={existingDriverAvailabilities}
                  existingEscortAvailabilities={existingEscortAvailabilities}
                  register={register}
                  control={control}
                />
              </div>

              {visibleChildren.length > 0 && (
                <div data-guide="member-availability-child-status">
                  <ChildAvailabilitySection
                    childList={visibleChildren}
                    notParticipatingIds={notParticipatingIds}
                    selfDrivingIds={selfDrivingIds}
                    onToggleNotParticipating={toggleNotParticipating}
                    onToggleSelfDriving={toggleSelfDriving}
                  />
                </div>
              )}

              <div data-guide="member-availability-submit" className="sm:max-w-[260px]">
                <FormButton
                  label="送信"
                  type="submit"
                  isSubmitting={isSubmitting}
                  loadingLabel="送信中..."
                  className="w-full py-3 text-base"
                />
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
      </div>
    </div>
  );
}
