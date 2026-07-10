"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import GuidedTour, { type GuidedTourFocusRequest, type GuidedTourStep } from "@/app/_components/GuidedTour";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { UpdateRideValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { trackEvent } from "@/utils/analytics";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import RideBasicForm from "../_components/RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import RideDriverList from "../_components/RideDriverList";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { convertRideDetailToFormValues } from "@/utils/rideConverter";
import { formatRideExportText } from "@/utils/rideExport";
import { isAnswerLocked } from "@/utils/deadlineLock";
import { Car, Copy, Share2 } from "lucide-react";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { BillingStatusResponse } from "@/app/_types/response/billingResponse";
import toast from "react-hot-toast";
import { AttendanceListButton } from "@/app/_components/AttendanceListButton";
import AutoAssignPanel, { AutoAssignOptions } from "../_components/AutoAssignPanel";

const GUEST_EMAIL = "guest@carpool.demo";

const rideDetailGuideSteps = [
  {
    target: "admin-ride-basic",
    title: "配車予定を確認します",
    body: "日付、行き先、集合場所を確認します。変更した場合は最後に保存してください。",
  },
  {
    target: "admin-ride-share-request",
    title: "回答依頼をLINEに貼ります",
    body: "回答期限を必要に応じて設定し、「入力依頼をコピー」を押すとURLとPIN入りの文面をLINEに貼れます。",
  },
  {
    target: "admin-ride-auto-assign",
    title: "回答が集まったら割り当てます",
    body: "メンバーの回答が揃ったら、自動割り当てで配車案を作れます。必要なら手動で調整できます。",
  },
  {
    target: "admin-ride-manual-assign",
    title: "手動でもドライバーを追加できます",
    body: "「ドライバー追加」を押すと、下に配車カードが追加されます。自動割り当て後に車を増やしたり、手動で直したい時に使います。",
  },
  {
    target: "admin-ride-driver-select",
    title: "まずドライバーを選びます",
    body: "追加されたカードのプルダウンで担当ドライバーを選んでください。「選択する」を押すとガイドが閉じ、この欄を操作できます。",
    primaryLabel: "選択する",
    primaryAction: "dismiss",
  },
  {
    target: "admin-ride-driver-assignments",
    title: "乗せる人を選びます",
    body: "ドライバーを選ぶと、座席数に合わせて乗せる子どもと引率者の欄が出ます。必要な人を選んで配車を調整してください。",
    primaryLabel: "割り当てる",
    primaryAction: "dismiss",
  },
  {
    target: "admin-ride-share-final",
    title: "決定後の案内を共有します",
    body: "配車が決まったら、決定後の案内や配車内容をコピーしてLINEに共有します。",
  },
  {
    target: "admin-ride-save",
    title: "変更した内容を保存します",
    body: "配車内容を調整したら、最後に更新して確定します。",
  },
] satisfies GuidedTourStep[];

type AutoAssignResponse = {
  drivers: UpdateRideValues["drivers"];
  billing?: BillingStatusResponse["autoAssign"];
};

function formatRideDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${dow[d.getDay()]})`;
}


export default function Page() {
  const methods = useForm<UpdateRideValues>({
    defaultValues: {
      destination: "",
      meetingPlace: "",
      separateDirections: false,
      drivers: [],
    },
  });
  const {
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
    watch,
    control,
  } = methods;

  const { validateDate, handleDateChange } = createRideDateValidation(methods);

  const date = watch("date");
  const separateDirections = watch("separateDirections");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "drivers",
  });

  // トグルをオフにした時、全ドライバーをクリアする
  const prevSeparateDirections = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (prevSeparateDirections.current === true && separateDirections === false) {
      remove();
    }
    prevSeparateDirections.current = separateDirections;
  }, [separateDirections]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = useParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const { token, session } = useSupabaseSession();
  const isGuestUser = session?.user.email === GUEST_EMAIL;
  const shouldTrackShareCopy = Boolean(session?.user.email && !isGuestUser);
  const router = useRouter();

  const { data, error, isLoading, mutate } = useFetch<RideDetailResponse>(
    `/api/admin/teams/${teamId}/rides/${rideId}`,
  );
  const { data: billingData, mutate: mutateBilling } = useFetch<BillingStatusResponse>(
    "/api/admin/billing/status",
  );
  const isDeleting = useRef(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [lockAfterDeadline, setLockAfterDeadline] = useState(false);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<{ message: string; minimumCars?: number } | null>(null);
  const [guideFocusRequest, setGuideFocusRequest] = useState<GuidedTourFocusRequest | null>(null);

  const requestGuideFocus = useCallback((target: string) => {
    setGuideFocusRequest((current) => ({
      target,
      requestId: (current?.requestId ?? 0) + 1,
    }));
  }, []);

  useEffect(() => {
    if (data?.ride) {
      const formValues = convertRideDetailToFormValues(data.ride);
      // childId → currentGradeのMap生成
      const childrenMap = new Map(
        data.ride.children.map((c) => [c.id, c.currentGrade])
      );
      // 各ドライバーの空の行を削除し、学年順にソート
      formValues.drivers = formValues.drivers.map((driver) => ({
        ...driver,
        rideAssignments: driver.rideAssignments
          .filter((ra) => ra.childId !== 0 && childrenMap.has(ra.childId))
          .sort((a, b) => {
            const gradeA = childrenMap.get(a.childId) ?? -1;
            const gradeB = childrenMap.get(b.childId) ?? -1;
            return gradeB - gradeA;
          }),
      }));
      reset(formValues);

      // 回答期限の初期化
      if (data.ride.deadline) {
        const d = new Date(data.ride.deadline);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setDeadline(`${yyyy}-${mm}-${dd}`);
      }
      setLockAfterDeadline(data.ride.lockAfterDeadline ?? false);
    }
  }, [data, reset]);

  const onSubmit = async (data: UpdateRideValues) => {
    if (!validateDate()) return;
    if (!token) return;

    // availabilityDriverIdが未選択でも除外して送信
    const payload: UpdateRideValues = {
      ...data,
      drivers: data.drivers.filter((d) => d.availabilityDriverId !== 0), 
    };

    // 配車情報更新
    try {
      await api.put<UpdateRideValues>(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        payload,
        token,
      );
      toast.success("配車詳細を更新しました。");
      await mutate();
    } catch (e: unknown) {
      console.error(e);
      alert("更新中にエラーが発生しました。");
    }
  };

  // 自動割り当て実行
  const handleAutoAssign = async (options: AutoAssignOptions) => {
    if (!token) return;
    setIsAutoAssigning(true);
    setAutoAssignError(null);
    try {
      const result = await api.post(
        `/api/admin/teams/${teamId}/rides/${rideId}/auto-assign`,
        {
          numberOfCars: options.numberOfCars,
          separateParentChild: options.separateParentChild,
        },
        token,
      ) as AutoAssignResponse;
      // 初期ロード時と同じ前処理（空行除去 + 学年降順ソート）を適用
      const childrenMap = new Map(
        (data?.ride?.children ?? []).map((c) => [c.id, c.currentGrade])
      );
      const processedDrivers = result.drivers.map((driver) => ({
        ...driver,
        rideAssignments: driver.rideAssignments
          .filter((ra) => ra.childId !== 0 && childrenMap.has(ra.childId))
          .sort((a, b) => {
            const gradeA = childrenMap.get(a.childId) ?? -1;
            const gradeB = childrenMap.get(b.childId) ?? -1;
            return gradeB - gradeA;
          }),
      }));
      reset({ ...methods.getValues(), drivers: processedDrivers });
      toast.success("自動割り当て完了。保存ボタンで確定してください。");
      await mutateBilling();
    } catch (e: unknown) {
      const err = e as {
        message?: string;
        minimumCars?: number;
        billing?: BillingStatusResponse["autoAssign"];
      };
      setAutoAssignError({
        message: err.message ?? "自動割り当てに失敗しました。",
        minimumCars: err.minimumCars,
      });
      if (err.billing) {
        await mutateBilling(
          {
            status: "OK",
            billing: {
              plan: err.billing.plan,
              isPro: err.billing.isPro,
            },
            autoAssign: err.billing,
          },
          { revalidate: false },
        );
      }
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleAutoAssignUpgradeClick = () => {
    trackEvent("upgrade_clicked", { source: "auto_assign_limit" });
    router.push("/admin/profile#plan");
  };

  // 配車内容のテキストエクスポート（LINE共有用）
  const copyDetailText = () => {
    if (!data?.ride) return;
    const text = formatRideExportText(data.ride);
    copyToClipboard(text, "配車内容テキスト");
  };

  // 配車削除
  const handleDeleteRide = async () => {
    if (!confirm("配車を削除しますか？")) return;
    if (!token) return;

    try {
      isDeleting.current = true;
      await api.delete(`/api/admin/teams/${teamId}/rides/${rideId}`, token);

      toast.success("配車を削除しました。");

      router.replace(`/admin/teams/${teamId}/rides`);
    } catch (e: unknown) {
      isDeleting.current = false;
      console.error(e);
      alert("削除中にエラーが発生しました。");
    }
  };

  // 回答期限を保存
  const saveDeadline = async () => {
    if (!token) return;
    setIsSavingDeadline(true);
    try {
      await api.patch(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        { deadline: deadline || null, lockAfterDeadline },
        token,
      );
      toast.success("回答期限を保存しました。");
      await mutate();
    } catch (e) {
      console.error(e);
      alert("回答期限の保存に失敗しました。");
    } finally {
      setIsSavingDeadline(false);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      if (shouldTrackShareCopy) {
        trackEvent("share_text_copied", {
          team_id: teamId,
          ride_id: rideId,
          copy_type: label,
        });
      }
      setTimeout(() => setCopied(null), 2000);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  // 配車可否の入力依頼テキストをコピー
  const copyShareText = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードが設定されていません。チームを再作成してください。");
      return;
    }

    const dateLabel = formatRideDate(data.ride.date);
    const dl = deadline ? new Date(deadline) : null;
    const deadlineText = dl
      ? `\n${dl.getMonth() + 1}月${dl.getDate()}日までにご回答をお願いします。`
      : "";

    const destination = data.ride.destination ? ` ${data.ride.destination}` : "";
    const meetingPlaceLine = data.ride.meetingPlace
      ? `\n集合場所: ${data.ride.meetingPlace}`
      : "";

    const text = `${dateLabel}${destination}への車出し可否・お子さんの参加可否の入力をお願いします。${meetingPlaceLine}
${rideUrl}

PINコード: ${pin}
${deadlineText}`;

    copyToClipboard(text, "入力依頼テキスト");
  };

  // 未回答者への催促テキストをコピー
  const copyReminderText = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードが設定されていません。チームを再作成してください。");
      return;
    }

    const dateLabel = formatRideDate(data.ride.date);
    const destination = data.ride.destination ? ` ${data.ride.destination}` : "";
    const dl = deadline ? new Date(deadline) : null;
    const deadlineText = dl
      ? `\n${dl.getMonth() + 1}月${dl.getDate()}日までにご回答をお願いします。`
      : "";

    const text = `【リマインド】${dateLabel}${destination}の車出し可否・お子さんの参加可否について、まだご回答いただいていない方はご入力をお願いします。
${rideUrl}

PINコード: ${pin}
${deadlineText}`;

    copyToClipboard(text, "催促テキスト");
  };

  // 配車決定後の案内テキストをコピー
  const copyAssignmentText = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードが設定されていません。チームを再作成してください。");
      return;
    }

    const dateLabel = formatRideDate(data.ride.date);
    const destination = data.ride.destination ? ` ${data.ride.destination}` : "";
    const meetingPlaceLine = data.ride.meetingPlace
      ? `\n集合場所: ${data.ride.meetingPlace}`
      : "";

    const text = `${dateLabel}${destination}への配車割をご確認ください。${meetingPlaceLine}
${rideUrl}

PINコード: ${pin}

よろしくお願いします。`;

    copyToClipboard(text, "配車割テキスト");
  };

  // 保存済みの設定に基づく現在のロック状態
  const answerLocked = isAnswerLocked(
    data?.ride?.deadline,
    data?.ride?.lockAfterDeadline
  );

  // 回答状況の集計（全保護者のうち、可否を回答済みの人を除いた残りが未回答者）
  const guardians = data?.ride?.guardians ?? [];
  const answeredGuardianIds = new Set(
    (data?.ride?.availabilityDrivers ?? []).map((ad) => ad.guardian.id)
  );
  const unansweredGuardians = guardians.filter(
    (g) => !answeredGuardianIds.has(g.id)
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    if (isDeleting.current) {
      return <LoadingSpinner />;
    }
    if (error.message?.includes("404") || error.status === 404) {
      notFound();
    }
  }

  return (
    <div className="app-page">
      <div className="app-container">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">配車情報</p>
            <h1 className="app-section-title flex items-center gap-2">
              <Car size={26} className="text-teal-700" />
              配車詳細
            </h1>
          </div>
          <GuidedTour
            storageKey="admin-ride-detail-guided-tour:v1"
            steps={rideDetailGuideSteps}
            autoStart
            className="app-button-secondary w-full shrink-0 sm:w-auto"
            focusRequest={guideFocusRequest}
          />
        </div>
      <div className="app-card min-w-0 overflow-hidden p-4 md:p-8">
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 md:space-y-8 min-w-0"
          >
            <div className="app-panel p-4 md:p-5" data-guide="admin-ride-basic">
              <div className="mx-auto w-full max-w-md">
                <RideBasicForm
                  date={date}
                  onDateChange={handleDateChange}
                  error={!!errors.date}
                />
              </div>
            </div>

            {/* 参加者・欠席者一覧ボタン */}
            <div className="flex justify-center">
              <AttendanceListButton
                href={`/admin/teams/${teamId}/rides/${rideId}/attendance`}
              />
            </div>

            {/* 行き帰り別配車モード切替 */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    {...methods.register("separateDirections")}
                  />
                  <div className={`h-6 w-11 rounded-full transition-colors ${separateDirections ? 'bg-teal-600' : 'bg-gray-300'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${separateDirections ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  行き帰りを別々に配車する
                </span>
              </label>
            </div>

            {/* 自動割り当てパネル */}
            <div data-guide="admin-ride-auto-assign">
              <AutoAssignPanel
                onAssign={handleAutoAssign}
                isAssigning={isAutoAssigning}
                error={autoAssignError}
                defaultNumberOfCars={data?.ride?.availabilityDrivers.filter(
                  (d) => d.type === "driver" && d.availability === true
                ).length}
                billingStatus={billingData?.autoAssign}
                onUpgradeClick={handleAutoAssignUpgradeClick}
              />
            </div>

            <RideDriverList
              drivers={fields}
              separateDirections={separateDirections}
              availabilityDrivers={data?.ride?.availabilityDrivers ?? []}
              childrenList={data?.ride?.children ?? []}
              childAvailabilities={data?.ride?.childAvailabilities ?? []}
              appendDriver={(direction) =>
                append({
                  availabilityDriverId: 0,
                  seats: 0,
                  type: 'driver',
                  direction,
                  rideAssignments: [],
                  escorts: [],
                })
              }
              removeDriver={remove}
              onDriverAdded={() => requestGuideFocus("admin-ride-driver-select")}
              onDriverSelected={() => requestGuideFocus("admin-ride-driver-assignments")}
            />

            {/* 自走参加者セクション */}
            {(() => {
              const selfDrivingChildren = (data?.ride?.childAvailabilities ?? [])
                .filter((ca) => ca.selfDriving)
                .map((ca) => (data?.ride?.children ?? []).find((c) => c.id === ca.childId))
                .filter((c): c is NonNullable<typeof c> => c !== undefined);
              if (selfDrivingChildren.length === 0) return null;
              return (
                <div className="p-4 border-2 border-blue-200 rounded-xl bg-blue-50">
                  <h3 className="mb-3 text-base font-bold">自走参加者</h3>
                  <div className="flex flex-wrap gap-2">
                    {selfDrivingChildren.map((child) => (
                      <span
                        key={child.id}
                        className="px-3 py-1.5 bg-white border border-blue-200 rounded-full text-sm"
                      >
                        {child.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* メンバー共有セクション */}
            <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50/80 p-4 md:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-950">
                <Share2 size={20} className="text-teal-700" />
                メンバー共有用
              </h3>

              {/* ゲストユーザーの場合のみPINコードを表示 */}
              {isGuestUser && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <p className="mb-1 flex items-center gap-1 text-sm font-bold text-amber-800">
                    デモ用PINコード
                  </p>
                  <p className="text-3xl font-mono font-bold text-amber-900 my-2">
                    1234
                  </p>
                  <p className="text-xs text-amber-700">
                    メンバー画面を試すには、下記のURLにアクセスしてこのPINコードを入力してください
                  </p>
                </div>
              )}

              {/* URL */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  アクセスURL
                </label>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="text"
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`
                        : ""
                    }
                    className="app-input flex-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`,
                        "URL",
                      )
                    }
                    className="app-button-primary whitespace-nowrap"
                  >
                    <Copy size={16} />
                    {copied === "URL" ? "✓" : "コピー"}
                  </button>
                </div>
              </div>

              {/* 回答期限 */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  回答期限（任意）
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="app-input max-w-44 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveDeadline}
                    disabled={isSavingDeadline}
                    className="app-button-primary whitespace-nowrap"
                  >
                    {isSavingDeadline ? "保存中..." : "設定"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  設定すると入力依頼テキストに「〇月〇日までにご回答をお願いします。」が追加されます
                </p>
                <label className="mt-3 flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lockAfterDeadline}
                    onChange={(e) => setLockAfterDeadline(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-teal-600"
                  />
                  <span className="text-sm text-gray-700">
                    期限を過ぎたら回答をロックする
                    <span className="block text-xs text-gray-500">
                      期限日の翌日からメンバーは回答・変更ができなくなります（チェックを外して「設定」を押すと解除）
                    </span>
                  </span>
                </label>
                {answerLocked && (
                  <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    🔒 現在ロック中です。メンバーは回答できません。解除するにはチェックを外して「設定」を押してください。
                  </p>
                )}
              </div>

              {/* 回答状況 */}
              {guardians.length > 0 && (
                <div className="mb-4 rounded-lg border border-teal-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-950">回答状況</p>
                    <p className="text-sm font-semibold text-teal-800">
                      {guardians.length - unansweredGuardians.length} / {guardians.length} 人 回答済み
                    </p>
                  </div>
                  {unansweredGuardians.length > 0 ? (
                    <>
                      <p className="mb-2 text-xs text-gray-500">未回答の保護者</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {unansweredGuardians.map((g) => (
                          <span
                            key={g.id}
                            className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={copyReminderText}
                        className="app-button-secondary w-full"
                      >
                        <Share2 size={16} />
                        {copied === "催促テキスト"
                          ? "コピーしました！"
                          : "催促テキストをコピー（LINE用）"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-teal-700">全員回答済みです 🎉</p>
                  )}
                </div>
              )}

              {/* 共有用テキストコピーボタン */}
              <div className="mt-5 border-t border-teal-200/70 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-gray-950">
                    共有テキストをコピー
                  </p>
                  <p className="shrink-0 text-xs font-medium text-teal-800">
                    LINE共有用
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={copyShareText}
                    data-guide="admin-ride-share-request"
                    className="app-button-primary min-h-[4.25rem] w-full flex-col items-start justify-start px-4 py-2.5 text-left md:min-h-[5rem] md:py-3"
                  >
                    <span className="text-xs font-semibold text-white/75">
                      1. 依頼
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <Share2 size={18} />
                      {copied === "入力依頼テキスト"
                        ? "コピーしました！"
                        : "入力依頼をコピー"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={copyAssignmentText}
                    data-guide="admin-ride-share-final"
                    className="app-button-secondary min-h-[4.25rem] w-full flex-col items-start justify-start px-4 py-2.5 text-left md:min-h-[5rem] md:py-3"
                  >
                    <span className="text-xs font-semibold text-gray-500">
                      2. 決定後
                    </span>
                    <span className="flex items-center gap-2 text-sm text-gray-800">
                      <Share2 size={18} />
                      {copied === "配車割テキスト"
                        ? "コピーしました！"
                        : "決定後の案内をコピー"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={copyDetailText}
                    className="app-button-secondary min-h-[4.25rem] w-full flex-col items-start justify-start border-teal-200 bg-white px-4 py-2.5 text-left text-teal-900 hover:bg-teal-50 md:min-h-[5rem] md:py-3"
                  >
                    <span className="text-xs font-semibold text-teal-700">
                      配車内容
                    </span>
                    <span className="flex items-center gap-2 text-sm">
                      <Copy size={18} />
                      {copied === "配車内容テキスト"
                        ? "コピーしました！"
                        : "配車内容をコピー"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div data-guide="admin-ride-save">
              <UpdateDeleteButtons
                onUpdate={handleSubmit(onSubmit)}
                onDelete={handleDeleteRide}
                isSubmitting={isSubmitting}
              />
            </div>
          </form>
        </FormProvider>
      </div>
      </div>
    </div>
  );
}
