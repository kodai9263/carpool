"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import GuidedTour, { type GuidedTourFocusRequest, type GuidedTourStep } from "@/app/_components/GuidedTour";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { UpdateRideValues } from "@/app/_types/ride";
import type { SettlementAccessErrorResponse, SettlementCreateResponse } from "@/app/_types/settlement";
import { api } from "@/utils/api";
import { trackEvent } from "@/utils/analytics";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import RideBasicForm from "../_components/RideBasicForm";
import { createRideDateValidation } from "../_hooks/useRideDateValidation";
import RideDriverList from "../_components/RideDriverList";
import { RideShareDialog } from "../_components/RideShareDialog";
import { convertRideDetailToFormValues } from "@/utils/rideConverter";
import { formatRideExportText } from "@/utils/rideExport";
import { isAnswerLocked } from "@/utils/deadlineLock";
import { Car, Copy, ReceiptText, Share2, X } from "lucide-react";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { BillingStatusResponse } from "@/app/_types/response/billingResponse";
import AutoAssignPanel, { AutoAssignOptions } from "../_components/AutoAssignPanel";
import { UpgradeDialog } from "@/app/admin/_components/UpgradeDialog";
import toast from "react-hot-toast";
import { AttendanceListButton } from "@/app/_components/AttendanceListButton";
import { BillingReturnNotice } from "@/app/admin/_components/BillingReturnNotice";
import { SettlementBillingButton } from "@/app/admin/_components/SettlementBillingButton";
import { SettlementBillingReturnNotice } from "@/app/admin/_components/SettlementBillingReturnNotice";
import { parseRideCheckoutDraft, rideCheckoutDraftKey, serializeRideCheckoutDraft } from "@/utils/rideCheckoutDraft";

const GUEST_EMAIL = "guest@carpool.demo";

const rideDetailGuideSteps = [
  {
    target: "admin-ride-basic",
    title: "配車予定を確認します",
    body: "日付、行き先、集合場所を確認します。変更した場合は最後に保存してください。",
  },
  {
    target: "admin-ride-share-request",
    title: "回答を依頼します",
    body: "「回答を依頼」から文面を確認し、LINEまたはコピーで共有できます。期限は共有の詳細から設定できます。",
  },
  {
    target: "admin-ride-auto-assign",
    title: "自動で配車案を作れます",
    body: "回答が集まったら、自動割り当てで配車案を作れます。下の欄で手動調整し、保存して確定してください。",
  },
  {
    target: "admin-ride-manual-assign",
    title: "ドライバーを追加します",
    body: "回答を確認し、「ドライバー追加」で配車カードを追加します。担当する保護者を選んで、乗せる人を割り当ててください。",
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
    target: "admin-ride-save",
    title: "変更した内容を保存します",
    body: "配車内容を調整したら、最後に更新して確定します。",
  },
  {
    target: "admin-ride-share-final",
    title: "決定後の案内を共有します",
    body: "配車を保存したら、「配車決定を連絡」からメンバーへ案内できます。",
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
    formState: { isSubmitting, errors, isDirty },
    reset,
    watch,
    control,
  } = methods;

  const { validateDate, handleDateChange } = createRideDateValidation(methods);

  const date = watch("date");
  const destination = watch("destination");
  const meetingPlace = watch("meetingPlace");
  const basicDetails = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if ((errors.date || errors.destination || errors.meetingPlace) && basicDetails.current) {
      basicDetails.current.open = true;
    }
  }, [errors.date, errors.destination, errors.meetingPlace]);
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
  const basicChanged = Boolean(data?.ride && (
    date?.getTime() !== new Date(data.ride.date).getTime() ||
    (destination ?? "") !== (data.ride.destination ?? "") ||
    (meetingPlace ?? "") !== (data.ride.meetingPlace ?? "")
  ));
  const { data: billingData, error: billingError, mutate: mutateBilling } = useFetch<BillingStatusResponse>("/api/admin/billing/status");
  const autoAssignInFlight = useRef(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<{ message: string; minimumCars?: number } | null>(null);
  const [assignmentSummary, setAssignmentSummary] = useState<{ children: number; cars: number } | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const isDeleting = useRef(false);
  const [sharePreview, setSharePreview] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("");
  const [lockAfterDeadline, setLockAfterDeadline] = useState(false);
  const [isSavingDeadline, setIsSavingDeadline] = useState(false);
  const [isStartingSettlement, setIsStartingSettlement] = useState(false);
  const [settlementAccessError, setSettlementAccessError] = useState<SettlementAccessErrorResponse | null>(null);
  const [guideFocusRequest, setGuideFocusRequest] = useState<GuidedTourFocusRequest | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasStaleSavedRide, setHasStaleSavedRide] = useState(false);
  const [savedAssignmentNotice, setSavedAssignmentNotice] = useState(false);
  const initializedForm = useRef<string | null>(null);
  const scrolledAction = useRef<string | null>(null);
  const [autoStartGuide, setAutoStartGuide] = useState(false);
  const draftKey = session?.user.id ? rideCheckoutDraftKey(session.user.id, teamId, rideId) : null;

  useEffect(() => {
    if (isLoading || !data?.ride) return;
    const target = window.location.hash.slice(1);
    const isAction = ["auto-assign", "manual-assign", "share-request", "answer-deadline", "share-final", "ride-save"].includes(target);
    setAutoStartGuide(!isAction);
    const key = `${teamId}:${rideId}:${target}`;
    if (!isAction || scrolledAction.current === key) return;
    // 初回遷移時は読込中にアンカーがないため、フォーム描画後に案内先へ移動する。
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(target);
      if (!element) return;
      let ancestor = element.parentElement;
      while (ancestor) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
      element.scrollIntoView({ block: "center" });
      element.focus({ preventScroll: true });
      scrolledAction.current = key;
    });
    return () => cancelAnimationFrame(frame);
  }, [data?.ride, isLoading, teamId, rideId]);

  const refreshBilling = useCallback(async () => {
    await mutateBilling();
  }, [mutateBilling]);

  const requestGuideFocus = useCallback((target: string) => {
    setGuideFocusRequest((current) => ({
      target,
      requestId: (current?.requestId ?? 0) + 1,
    }));
  }, []);

  useEffect(() => {
    if (data?.ride && draftKey && initializedForm.current !== draftKey) {
      initializedForm.current = draftKey;
      setDraftRestored(false);
      setAssignmentSummary(null);
      setAutoAssignError(null);
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
      // 再取得で編集中のフォームを上書きしない。決済復帰時は同じ管理者の下書きを優先する。
      const query = new URLSearchParams(window.location.search);
      if (query.has("checkout") || query.get("portal") === "return") {
        try {
          const draft = parseRideCheckoutDraft(sessionStorage.getItem(draftKey));
          if (draft) {
            prevSeparateDirections.current = draft.values.separateDirections;
            reset(draft.values);
            setDeadline(draft.deadline);
            setLockAfterDeadline(draft.lockAfterDeadline);
            setDraftRestored(true);
            return;
          }
        } catch {
          toast.error("決済前の入力を復元できませんでした。保存済みの配車を表示します。");
        }
      }
      prevSeparateDirections.current = formValues.separateDirections;
      reset(formValues);

      // 回答期限の初期化
      if (data.ride.deadline) {
        const d = new Date(data.ride.deadline);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setDeadline(`${yyyy}-${mm}-${dd}`);
      } else {
        setDeadline("");
      }
      setLockAfterDeadline(data.ride.lockAfterDeadline ?? false);
    }
  }, [data, reset, draftKey]);

  const onSubmit = async (data: UpdateRideValues) => {
    if (!validateDate()) return;
    if (!token || autoAssignInFlight.current) return;

    // availabilityDriverIdが未選択でも除外して送信
    const payload: UpdateRideValues = {
      ...data,
      drivers: data.drivers.filter((d) => d.availabilityDriverId !== 0), 
    };

    // 配車情報更新
    setSavedAssignmentNotice(false);
    try {
      await api.put<UpdateRideValues>(
        `/api/admin/teams/${teamId}/rides/${rideId}`,
        payload,
        token,
      );
      setHasStaleSavedRide(true);
      toast.success("配車詳細を更新しました。");
      reset(payload);
      setAssignmentSummary(null);
      setAutoAssignError(null);
      setDraftRestored(false);
      if (shouldTrackShareCopy) trackEvent("ride_saved", { team_id: teamId, ride_id: rideId });
      // 回答期限には別の保存ボタンがあるため、その未保存値も下書きに残す。
      if (draftKey) {
        try {
          sessionStorage.setItem(draftKey, serializeRideCheckoutDraft({ values: payload, deadline, lockAfterDeadline }));
        } catch { /* 保存済みの配車はサーバーから復元できる */ }
      }
      try {
        const refreshed = await mutate();
        if (!refreshed?.ride) throw new Error("保存済みの配車を再取得できませんでした。");
        setHasStaleSavedRide(false);
        setSavedAssignmentNotice(refreshed.ride.drivers.some((driver) =>
          driver.rideAssignments.length > 0 ||
          driver.escorts.some((escort) => escort.rideAssignments.length > 0)
        ));
      } catch {
        toast.error("配車の保存は完了しました。最新の内容を取得できなかったため、再読み込みしてから連絡してください。");
      }
    } catch (e: unknown) {
      console.error(e);
      alert("更新中にエラーが発生しました。");
    }
  };

  // 自動割り当て実行
  const handleAutoAssign = async (options: AutoAssignOptions) => {
    if (!token || autoAssignInFlight.current || isSubmitting || isStartingSettlement) return;
    if (!billingData?.autoAssign.canUseAutoAssign) return;
    if (hasStaleSavedRide || methods.getValues("separateDirections") !== data?.ride.separateDirections) {
      setAutoAssignError({ message: "行き帰りの配車設定を先に保存し、最新の内容を確認してから実行してください。" });
      return;
    }
    autoAssignInFlight.current = true;
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
      // 自動生成も未保存の編集として扱い、保存前の精算開始を防ぐ。
      methods.setValue("drivers", processedDrivers, { shouldDirty: true, shouldValidate: true });
      setSavedAssignmentNotice(false);
      setAssignmentSummary({
        children: new Set(processedDrivers.flatMap((driver) => [
          ...driver.rideAssignments.map((row) => row.childId),
          ...driver.escorts.flatMap((escort) => escort.rideAssignments.map((row) => row.childId)),
        ]).filter((id) => id > 0)).size,
        cars: new Set(processedDrivers.map((driver) => driver.availabilityDriverId)).size,
      });
      toast.success("自動割り当て完了。保存ボタンで確定してください。");
      if (result.billing) {
        await mutateBilling({
          status: "OK",
          billing: { plan: result.billing.plan, isPro: result.billing.isPro },
          autoAssign: result.billing,
        }, { revalidate: false });
      } else {
        // 配車案の作成成功と、残り回数の再取得失敗を分けて扱う。
        await mutateBilling().catch(() => toast.error("プラン情報を更新できませんでした。再読み込みして確認してください。"));
      }
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
      autoAssignInFlight.current = false;
      setIsAutoAssigning(false);
    }
  };

  const handleAutoAssignUpgradeClick = () => {
    trackEvent("upgrade_offer_clicked", { source: "ride_auto_assign", ride_id: rideId });
    setIsUpgradeOpen(true);
  };

  const preserveCheckoutDraft = async () => {
    if (!draftKey || !token) throw new Error("ログイン状態を確認してください。");
    try {
      const serialized = serializeRideCheckoutDraft({ values: methods.getValues(), deadline, lockAfterDeadline });
      sessionStorage.setItem(draftKey, serialized);
      if (sessionStorage.getItem(draftKey) !== serialized) throw new Error("保存の確認に失敗");
    } catch {
      throw new Error("入力内容を一時保存できませんでした。配車を更新してからもう一度お試しください。");
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
        { deadline: deadline || null, lockAfterDeadline },
        token,
      );
      toast.success("回答期限を保存しました。");
      if (draftKey) {
        try {
          sessionStorage.setItem(draftKey, serializeRideCheckoutDraft({ values: methods.getValues(), deadline, lockAfterDeadline }));
        } catch { /* 保存済みの期限はサーバーから復元できる */ }
      }
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

  // 保存済みの内容で回答依頼のプレビューを開く
  const openRequestShare = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}/availability`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードを確認できません。チーム設定を確認してください。");
      return;
    }

    const dateLabel = formatRideDate(data.ride.date);
    const dl = data.ride.deadline ? new Date(data.ride.deadline) : null;
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

    setSharePreview({ title: "回答を依頼", text });
  };

  // 未回答者への再依頼のプレビューを開く
  const openReminderShare = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}/availability`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードを確認できません。チーム設定を確認してください。");
      return;
    }

    const dateLabel = formatRideDate(data.ride.date);
    const destination = data.ride.destination ? ` ${data.ride.destination}` : "";
    const dl = data.ride.deadline ? new Date(data.ride.deadline) : null;
    const deadlineText = dl
      ? `\n${dl.getMonth() + 1}月${dl.getDate()}日までにご回答をお願いします。`
      : "";

    const text = `【リマインド】${dateLabel}${destination}の車出し可否・お子さんの参加可否について、まだご回答いただいていない方はご入力をお願いします。
${rideUrl}

PINコード: ${pin}
${deadlineText}`;

    setSharePreview({ title: "未回答の方に再依頼", text });
  };

  // 配車決定後の案内のプレビューを開く
  const openAssignmentShare = () => {
    if (!data?.ride) return;

    const rideUrl = `${window.location.origin}/member/teams/${teamId}/rides/${rideId}`;
    const pin = data.ride.pin;

    if (!pin) {
      alert("PINコードを確認できません。チーム設定を確認してください。");
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

    setSharePreview({ title: "配車決定を連絡", text });
  };

  const startSettlement = async (moveFreeTrial = false) => {
    if (!token || autoAssignInFlight.current || isSubmitting) return;
    if (isDirty || draftRestored || hasStaleSavedRide) {
      toast.error("配車の変更を先に保存してください。");
      return;
    }
    setIsStartingSettlement(true);
    try {
      const response = await api.post(
        `/api/admin/teams/${teamId}/rides/${rideId}/settlement`,
        { moveFreeTrial },
        token,
      ) as SettlementCreateResponse;
      setSettlementAccessError(null);
      router.push(`/admin/teams/${teamId}/settlements/${response.settlement.id}`);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "SETTLEMENT_SUBSCRIPTION_REQUIRED"
      ) {
        setSettlementAccessError(error as SettlementAccessErrorResponse);
        setIsStartingSettlement(false);
        return;
      }
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "遠征費精算を開始できませんでした。";
      toast.error(message);
      setIsStartingSettlement(false);
    }
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
        {settlementAccessError && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/45 p-0 sm:items-center sm:p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="settlement-access-title" className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-700">遠征費精算オプション</p>
                  <h2 id="settlement-access-title" className="mt-1 text-xl font-bold text-gray-950">
                    {settlementAccessError.reason === "trial_in_use" ? "無料体験は別の遠征で利用中です" : "無料体験は利用済みです"}
                  </h2>
                </div>
                <button type="button" onClick={() => setSettlementAccessError(null)} aria-label="料金案内を閉じる" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-700">{settlementAccessError.message}</p>
              <div className="mt-5 space-y-3">
                {settlementAccessError.freeTrialSettlementId && (
                  <Link href={`/admin/teams/${teamId}/settlements/${settlementAccessError.freeTrialSettlementId}`} className="app-button-secondary w-full">
                    利用中の無料精算を見る
                  </Link>
                )}
                {settlementAccessError.reason === "trial_in_use" && (
                  <button type="button" onClick={() => startSettlement(true)} disabled={isStartingSettlement} className="app-button-secondary w-full">
                    {isStartingSettlement ? "変更中..." : "無料体験をこの遠征へ変更"}
                  </button>
                )}
                <SettlementBillingButton
                  teamId={Number(teamId)}
                  token={token}
                  returnPath={`/admin/teams/${teamId}/rides/${rideId}`}
                  className="app-button-primary w-full"
                >
                  月{settlementAccessError.monthlyPrice.toLocaleString("ja-JP")}円の精算プランを始める
                </SettlementBillingButton>
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500">確定済みの精算履歴や受領・返金の記録は、契約の有無にかかわらず引き続き利用できます。</p>
            </div>
          </div>
        )}
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
            autoStart={autoStartGuide}
            className="app-button-secondary w-full shrink-0 sm:w-auto"
            focusRequest={guideFocusRequest}
          />
        </div>
      <BillingReturnNotice token={token} onConfirmed={refreshBilling} onPendingChange={setIsPaymentPending} />
      <SettlementBillingReturnNotice
        teamId={Number(teamId)}
        token={token}
        onActive={() => startSettlement(false)}
      />
      {draftRestored && (
        <p role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-900">
          決済前の入力を復元しました。配車は画面下の「更新」、回答期限は「設定」で保存できます。
        </p>
      )}
      <UpgradeDialog
        open={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onBeforeCheckout={preserveCheckoutDraft}
        returnPath={`/admin/teams/${teamId}/rides/${rideId}`}
        source="ride_auto_assign"
        token={token}
        isPaymentPending={isPaymentPending}
      />
      <div className="app-card min-w-0 overflow-hidden p-4 md:p-8">
        <RideShareDialog open={sharePreview !== null} title={sharePreview?.title ?? "共有"} text={sharePreview?.text ?? ""} onClose={() => setSharePreview(null)} onCopy={async (text) => {
          await navigator.clipboard.writeText(text);
          if (shouldTrackShareCopy) trackEvent("share_text_copied", { team_id: teamId, ride_id: rideId, copy_type: sharePreview?.title ?? "共有" });
        }} />
        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="min-w-0"
          >
            <fieldset disabled={isAutoAssigning} className="min-w-0 space-y-6 md:space-y-8">
            <details ref={basicDetails} className="app-panel group p-4 md:p-5" data-guide="admin-ride-basic">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 break-words">
                  <span className="block font-semibold text-gray-950">
                    {date && !Number.isNaN(date.getTime()) ? formatRideDate(date.toISOString()) : "日付未設定"}
                    {" · "}{destination || "行き先未設定"}
                  </span>
                  <span className="mt-1 block text-sm text-gray-600">集合: {meetingPlace || "未設定"}</span>
                  {basicChanged && <span className="mt-1 block text-xs font-medium text-amber-800">未保存の変更あり</span>}
                </span>
                <span className="shrink-0 text-sm font-medium text-teal-800">
                  <span className="group-open:hidden">編集</span>
                  <span className="hidden group-open:inline">閉じる</span>
                </span>
              </summary>
              <div className="mx-auto mt-4 w-full max-w-md border-t border-gray-200 pt-4">
                <RideBasicForm
                  date={date}
                  onDateChange={handleDateChange}
                  error={!!errors.date}
                />
                <p className="mt-3 text-xs text-gray-600">変更は画面下の「変更を更新」で保存します。</p>
              </div>
            </details>

            {/* 参加者・欠席者一覧ボタン */}
            <div className="flex justify-center">
              <AttendanceListButton
                href={`/admin/teams/${teamId}/rides/${rideId}/attendance`}
              />
            </div>

            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-700">行き帰りの配車設定{separateDirections ? "（別々に配車）" : "（共通）"}</summary>
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

            </details>

            {/* 自動割り当てパネル */}
            <div id="auto-assign" tabIndex={-1} className="scroll-mt-20" data-guide="admin-ride-auto-assign">
              <AutoAssignPanel
                onAssign={handleAutoAssign}
                isAssigning={isAutoAssigning}
                disabled={isSubmitting || isStartingSettlement}
                error={autoAssignError}
                defaultNumberOfCars={data?.ride?.availabilityDrivers.filter(
                  (d) => d.type === "driver" && d.availability === true
                ).length}
                billingStatus={billingData?.autoAssign}
                onUpgradeClick={handleAutoAssignUpgradeClick}
                onRequestAnswers={openRequestShare}
                isPaymentPending={isPaymentPending}
                analyticsKey={isGuestUser ? undefined : rideId}
                assignmentSummary={assignmentSummary}
              />
              {billingError && (
                <p role="alert" className="mt-2 text-sm text-red-700">プラン情報を取得できませんでした。ページを再読み込みしてください。</p>
              )}
            </div>

            <div id="manual-assign" tabIndex={-1} className="scroll-mt-20">
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
            </div>

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

            <div data-guide="admin-ride-save">
              {savedAssignmentNotice && !isDirty && !draftRestored && (
                <div role="status" className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
                  <p className="font-semibold">配車を保存しました</p>
                  <p className="mt-1 leading-6">次は、保存した内容を確認して保護者へ連絡しましょう。</p>
                  <button type="button" onClick={openAssignmentShare} className="app-button-secondary mt-3">連絡する文面を確認</button>
                </div>
              )}
              <button id="ride-save" type="submit" disabled={isSubmitting} className="app-button-primary mt-6 w-full">{isSubmitting ? "更新中..." : "変更を更新"}</button>
              <details className="mt-4 text-sm text-gray-600">
                <summary className="cursor-pointer">その他の操作</summary>
                <button type="button" onClick={handleDeleteRide} disabled={isSubmitting} className="app-button-secondary mt-3 text-red-700">この配車を削除</button>
              </details>
            </div>

            <section className="mt-8 rounded-xl border border-teal-200 bg-teal-50/80 p-4 md:p-6" aria-label="メンバーへの連絡">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-950"><Share2 size={20} />メンバーへの連絡</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" id="share-request" data-guide="admin-ride-share-request" onClick={openRequestShare} className="app-button-primary w-full">回答を依頼</button>
                <button type="button" id="share-final" data-guide="admin-ride-share-final" disabled={isSubmitting || hasStaleSavedRide} onClick={openAssignmentShare} className="app-button-secondary w-full">配車決定を連絡</button>
              </div>
              <p className="my-3 text-xs text-gray-600">保存済みの内容を共有します。変更したら先に更新してください。</p>
              {data?.ride.deadline && <p className="mb-3 text-sm text-gray-700">回答期限: {formatRideDate(data.ride.deadline)}{answerLocked ? "（回答ロック中）" : ""}</p>}
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
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-teal-800">未回答の方を確認・再依頼</summary>
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
                        onClick={openReminderShare}
                        className="app-button-secondary w-full"
                      >
                        <Share2 size={16} />
                        未回答の方に再依頼
                      </button>
                    </details>
                  ) : (
                    <p className="text-sm text-teal-700">全員回答済みです 🎉</p>
                  )}
                </div>
              )}

              <details className="border-t border-teal-200 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-teal-800">共有の詳細・期限設定</summary>
                <div className="mt-4">
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
              <div id="answer-deadline" tabIndex={-1} className="mb-4 scroll-mt-20">
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

                  <button type="button" onClick={copyDetailText} className="app-button-secondary w-full"><Copy size={16} />{copied === "配車内容テキスト" ? "コピーしました！" : "配車内容をコピー"}</button>
                </div>
              </details>
            </section>

            <section className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 md:p-6" aria-label="遠征費精算">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-950">
                <ReceiptText size={20} className="text-sky-700" />
                遠征費を精算
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                高速代・駐車場代・ガソリン代をまとめ、家庭ごとの負担額と立替分を計算します。
              </p>
              <button
                type="button"
                onClick={() => startSettlement(false)}
                disabled={isSubmitting || isStartingSettlement}
                className="app-button-primary mt-4 w-full sm:w-auto"
              >
                {isStartingSettlement ? "準備中..." : "この配車の精算を始める"}
              </button>
              <p className="mt-2 text-xs text-gray-600">配車に未保存の変更がある場合は、先に「変更を更新」してください。</p>
              <p className="mt-2 text-xs font-medium text-sky-900">最初の1遠征は無料。2遠征目から月980円／チームです。</p>
              <Link href={`/admin/teams/${teamId}/settlements`} className="mt-3 inline-flex text-sm font-semibold text-sky-800 hover:underline">
                過去の精算を見る
              </Link>
            </section>

            </fieldset>
          </form>
        </FormProvider>
      </div>
      </div>
    </div>
  );
}
