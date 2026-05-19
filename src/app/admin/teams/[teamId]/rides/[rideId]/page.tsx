"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { UpdateRideValues } from "@/app/_types/ride";
import { api } from "@/utils/api";
import { trackEvent } from "@/utils/analytics";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import RideBasicForm from "../_components/RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import RideDriverList from "../_components/RideDriverList";
import { UpdateDeleteButtons } from "../../../_components/UpdateDeleteButtons";
import { convertRideDetailToFormValues } from "@/utils/rideConverter";
import { formatRideExportText } from "@/utils/rideExport";
import { Car, Copy, Share2 } from "lucide-react";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { supabase } from "@/utils/supabase";
import toast from "react-hot-toast";
import { AttendanceListButton } from "@/app/_components/AttendanceListButton";
import AutoAssignPanel, { AutoAssignOptions } from "../_components/AutoAssignPanel";

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
  const { token } = useSupabaseSession();
  const router = useRouter();

  const { data, error, isLoading, mutate } = useFetch<RideDetailResponse>(
    `/api/admin/teams/${teamId}/rides/${rideId}`,
  );
  const isDeleting = useRef(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<{ message: string; minimumCars?: number } | null>(null);

  useEffect(() => {
    const checkGuestUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email === "guest@carpool.demo") {
        setIsGuestUser(true);
      }
    };
    checkGuestUser();
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
      const result = await api.post<{ numberOfCars?: number }>(
        `/api/admin/teams/${teamId}/rides/${rideId}/auto-assign`,
        {
          numberOfCars: options.numberOfCars,
          separateParentChild: options.separateParentChild,
        },
        token,
      ) as { drivers: UpdateRideValues["drivers"] };
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
      trackEvent("auto_assign_used", {
        team_id: teamId,
        ride_id: rideId,
        number_of_cars: options.numberOfCars ?? "auto",
        separate_parent_child: options.separateParentChild,
      });
      toast.success("自動割り当て完了。保存ボタンで確定してください。");
    } catch (e: unknown) {
      const err = e as { message?: string; minimumCars?: number };
      setAutoAssignError({
        message: err.message ?? "自動割り当てに失敗しました。",
        minimumCars: err.minimumCars,
      });
    } finally {
      setIsAutoAssigning(false);
    }
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
        { deadline: deadline || null },
        token,
      );
      toast.success("回答期限を保存しました。");
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
      trackEvent("share_text_copied", {
        team_id: teamId,
        ride_id: rideId,
        copy_type: label,
      });
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
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">配車情報</p>
          <h1 className="app-section-title flex items-center gap-2">
            <Car size={26} className="text-teal-700" />
            配車詳細
          </h1>
        </div>
      <div className="app-card min-w-0 overflow-hidden p-4 md:p-8">
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 md:space-y-8 min-w-0"
          >
            <div className="app-panel p-4 md:p-5">
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
            <AutoAssignPanel
              onAssign={handleAutoAssign}
              isAssigning={isAutoAssigning}
              error={autoAssignError}
              defaultNumberOfCars={data?.ride?.availabilityDrivers.filter(
                (d) => d.type === "driver" && d.availability === true
              ).length}
            />

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
                  設定すると①のテキストに「〇月〇日までにご回答をお願いします。」が追加されます
                </p>
              </div>

              {/* 共有用テキストコピーボタン */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={copyShareText}
                  className="app-button-primary w-full text-xs sm:text-sm"
                >
                  <Share2 size={18} />
                  {copied === "入力依頼テキスト"
                    ? "コピーしました！"
                    : "①配車可否・参加可否の入力依頼をコピー"}
                </button>
                <button
                  type="button"
                  onClick={copyAssignmentText}
                  className="app-button-secondary w-full text-sm"
                >
                  <Share2 size={18} />
                  {copied === "配車割テキスト"
                    ? "コピーしました！"
                    : "②配車決定後の案内をコピー"}
                </button>
                <button
                  type="button"
                  onClick={copyDetailText}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Copy size={18} />
                  {copied === "配車内容テキスト"
                    ? "コピーしました！"
                    : "③配車内容をテキストでコピー（LINE共有用）"}
                </button>
              </div>
            </div>

            <UpdateDeleteButtons
              onUpdate={handleSubmit(onSubmit)}
              onDelete={handleDeleteRide}
              isSubmitting={isSubmitting}
            />
          </form>
        </FormProvider>
      </div>
      </div>
    </div>
  );
}
