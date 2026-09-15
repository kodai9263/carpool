"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import type {
  SettlementDetail,
  SettlementDetailResponse,
  SettlementDraft,
  SettlementDraftExpense,
  SettlementExpenseCategory,
  SettlementMovement,
} from "@/app/_types/settlement";
import {
  calculateSettlement,
  SettlementCalculationError,
  type SettlementCalculationResult,
} from "@/utils/settlementCalculation";
import { api } from "@/utils/api";
import { ArrowLeft, Calculator, Check, Clipboard, History, Pencil, Plus, Printer, ReceiptText, Trash2, WalletCards, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { SettlementBillingButton } from "@/app/admin/_components/SettlementBillingButton";
import { SettlementBillingReturnNotice } from "@/app/admin/_components/SettlementBillingReturnNotice";

const CATEGORY_LABELS: Record<SettlementExpenseCategory, string> = {
  toll: "高速代",
  parking: "駐車場代",
  fuel: "ガソリン代",
  other: "その他交通費",
};

const STATUS_LABELS: Record<SettlementDetail["status"], string> = {
  draft: "下書き",
  pending: "精算待ち",
  completed: "精算完了",
  voiding: "取消精算中",
  voided: "取消",
};

function yen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

function displayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function newExpense(): SettlementDraftExpense {
  return {
    id: `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: "toll",
    description: "",
    amount: 0,
    payerMemberId: null,
  };
}

function operationKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneDraft(draft: SettlementDraft): SettlementDraft {
  return JSON.parse(JSON.stringify(draft)) as SettlementDraft;
}

function calculationForDraft(draft: SettlementDraft): SettlementCalculationResult {
  return calculateSettlement({
    allocationMethod: draft.allocationMethod,
    costs: draft.expenses.map(({ amount, payerMemberId }) => ({ amount, payerMemberId })),
    families: draft.families.map((family) => ({
      memberId: family.memberId,
      isIncluded: family.isIncluded,
      childCount: family.children.filter((child) => child.isSelected).length,
    })),
  });
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function statusClass(status: SettlementDetail["status"]): string {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "voiding") return "bg-orange-100 text-orange-800";
  if (status === "voided") return "bg-gray-200 text-gray-700";
  return "bg-teal-100 text-teal-800";
}

export default function Page() {
  const { teamId, settlementId } = useParams<{ teamId: string; settlementId: string }>();
  const endpoint = `/api/admin/teams/${teamId}/settlements/${settlementId}`;
  const { data, error, isLoading, mutate } = useFetch<SettlementDetailResponse>(endpoint);
  const { token } = useSupabaseSession();
  const [draft, setDraft] = useState<SettlementDraft | null>(null);
  const [preview, setPreview] = useState<SettlementCalculationResult | null>(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [movingMemberId, setMovingMemberId] = useState<number | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<number | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [acceptSourceChanges, setAcceptSourceChanges] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [movementAmounts, setMovementAmounts] = useState<Record<number, string>>({});
  const [reversalReasons, setReversalReasons] = useState<Record<number, string>>({});
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isMovingFreeTrial, setIsMovingFreeTrial] = useState(false);
  const loadedVersion = useRef<number | null>(null);
  const savedDraftJson = useRef("");

  const settlement = data?.settlement;
  const isEditable = Boolean(settlement?.draft) && Boolean(settlement?.access.canEdit) && settlement?.status !== "voiding" && settlement?.status !== "voided";
  const confirmedCalculation = settlement?.calculation ?? settlement?.currentRevision?.snapshot.calculation ?? null;
  const displayCalculation = isEditable ? preview : confirmedCalculation;
  const familyNames = useMemo(
    () => new Map(
      (settlement?.currentRevision?.snapshot.families ?? draft?.families ?? []).map((family) => [family.memberId, family.memberName]),
    ),
    [draft?.families, settlement?.currentRevision?.snapshot.families],
  );
  const hasUnsavedChanges = Boolean(draft && JSON.stringify(draft) !== savedDraftJson.current);

  useEffect(() => {
    if (!settlement?.draft || loadedVersion.current === settlement.version) return;
    setDraft(cloneDraft(settlement.draft));
    savedDraftJson.current = JSON.stringify(settlement.draft);
    loadedVersion.current = settlement.version;
  }, [settlement]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  const updateDraft = (next: SettlementDraft) => {
    setDraft(next);
    setPreview(null);
    setIsAcknowledged(false);
    setMessage("");
    setFormError("");
  };

  const patchExpense = (id: string, values: Partial<SettlementDraftExpense>) => {
    if (!draft) return;
    updateDraft({
      ...draft,
      expenses: draft.expenses.map((expense) => expense.id === id ? { ...expense, ...values } : expense),
    });
  };

  const validateDraft = (): SettlementCalculationResult => {
    if (!draft) throw new SettlementCalculationError("下書きを読み込めませんでした");
    const invalidOther = draft.expenses.some(
      (expense) => expense.category === "other" && !expense.description.trim(),
    );
    if (invalidOther) throw new SettlementCalculationError("その他交通費の説明を入力してください");
    return calculationForDraft(draft);
  };

  const saveDraft = async (): Promise<SettlementDetailResponse> => {
    if (!draft || !settlement || !token) throw new Error("保存の準備ができていません");
    const response = await api.patch(
      endpoint,
      { version: settlement.version, draft },
      token,
    ) as SettlementDetailResponse;
    savedDraftJson.current = JSON.stringify(response.settlement.draft ?? draft);
    loadedVersion.current = response.settlement.version;
    if (response.settlement.draft) setDraft(cloneDraft(response.settlement.draft));
    await mutate(response, false);
    return response;
  };

  const handleCalculate = () => {
    try {
      setPreview(validateDraft());
      setIsAcknowledged(false);
      setFormError("");
      setMessage("金額を計算しました。対象と立替元を確認してください。");
    } catch (error) {
      setPreview(null);
      setMessage("");
      setFormError(errorMessage(error, "入力内容を確認してください"));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFormError("");
    setMessage("");
    try {
      await saveDraft();
      setMessage("下書きを保存しました。");
    } catch (error) {
      setFormError(errorMessage(error, "下書きを保存できませんでした"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!token) return;
    setIsConfirming(true);
    setFormError("");
    setMessage("");
    try {
      validateDraft();
      const saved = await saveDraft();
      const response = await api.post(
        `${endpoint}/confirm`,
        { version: saved.settlement.version, correctionReason, acceptSourceChanges },
        token,
      ) as SettlementDetailResponse;
      await mutate(response, false);
      setPreview(null);
      setCorrectionReason("");
      setAcceptSourceChanges(false);
      setMessage("遠征費を確定しました。");
    } catch (error) {
      setFormError(errorMessage(error, "確定できませんでした"));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleMoveFreeTrial = async () => {
    if (!token || !settlement?.rideId) return;
    setIsMovingFreeTrial(true);
    setFormError("");
    try {
      const response = await api.post(
        `/api/admin/teams/${teamId}/rides/${settlement.rideId}/settlement`,
        { moveFreeTrial: true },
        token,
      ) as SettlementDetailResponse;
      await mutate(response, false);
      setMessage("無料体験の対象をこの遠征へ変更しました。");
    } catch (error) {
      setFormError(errorMessage(error, "無料体験の対象を変更できませんでした"));
    } finally {
      setIsMovingFreeTrial(false);
    }
  };

  const handleMovement = async (memberId: number, signedAmount: number) => {
    if (!token || !settlement || signedAmount === 0) return;
    setMovingMemberId(memberId);
    setFormError("");
    setMessage("");
    try {
      const response = await api.post(
        `${endpoint}/movements`,
        {
          version: settlement.version,
          operationKey: operationKey("movement"),
          memberId,
          type: signedAmount > 0 ? "receipt" : "refund",
          amount: Math.abs(signedAmount),
        },
        token,
      ) as SettlementDetailResponse;
      await mutate(response, false);
      setMovementAmounts((current) => ({ ...current, [memberId]: "" }));
      setMessage(signedAmount > 0 ? "受領を記録しました。" : "返金を記録しました。");
    } catch (error) {
      setFormError(errorMessage(error, "精算を記録できませんでした"));
    } finally {
      setMovingMemberId(null);
    }
  };

  const handleAmend = async () => {
    if (!token || !settlement) return;
    setIsChangingStatus(true);
    setFormError("");
    try {
      const response = await api.post(`${endpoint}/amend`, { version: settlement.version }, token) as SettlementDetailResponse;
      await mutate(response, false);
      setMessage("訂正用の下書きを作成しました。内容を修正し、理由を入力して確定してください。");
    } catch (error) {
      setFormError(errorMessage(error, "訂正を開始できませんでした"));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleRefreshSource = async () => {
    if (!token || !settlement) return;
    setIsChangingStatus(true);
    setFormError("");
    try {
      const response = await api.post(`${endpoint}/refresh-source`, { version: settlement.version }, token) as SettlementDetailResponse;
      await mutate(response, false);
      setAcceptSourceChanges(false);
      setPreview(null);
      setMessage("最新の配車内容から対象家庭を再取り込みしました。費用と対象を確認してください。");
    } catch (error) {
      setFormError(errorMessage(error, "配車内容を再取り込みできませんでした"));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleVoid = async () => {
    if (!token || !settlement) return;
    setIsChangingStatus(true);
    setFormError("");
    try {
      const response = await api.post(`${endpoint}/void`, {
        version: settlement.version,
        reason: voidReason,
      }, token) as SettlementDetailResponse;
      await mutate(response, false);
      setVoidReason("");
      setMessage(response.settlement.status === "voided"
        ? "精算を取り消しました。"
        : "取消精算を開始しました。受領済み・返金済みの金額を元に戻してください。");
    } catch (error) {
      setFormError(errorMessage(error, "精算を取り消せませんでした"));
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleReversal = async (movement: SettlementMovement) => {
    if (!token || !settlement) return;
    const note = reversalReasons[movement.id]?.trim() ?? "";
    setMovingMemberId(movement.memberIdSnapshot);
    setFormError("");
    try {
      const response = await api.post(`${endpoint}/movements`, {
        version: settlement.version,
        operationKey: operationKey("reversal"),
        memberId: movement.memberIdSnapshot,
        signedAmount: -movement.signedAmount,
        reversesMovementId: movement.id,
        note,
      }, token) as SettlementDetailResponse;
      await mutate(response, false);
      setReversalReasons((current) => ({ ...current, [movement.id]: "" }));
      setMessage("誤った記録の取消を追加しました。");
    } catch (error) {
      setFormError(errorMessage(error, "記録を取り消せませんでした"));
    } finally {
      setMovingMemberId(null);
    }
  };

  const copyFamilyMessage = async (memberId: number, result: SettlementCalculationResult["families"][number]) => {
    if (!settlement?.currentRevision) return;
    const source = settlement.currentRevision.snapshot.source;
    const name = familyNames.get(memberId) ?? `家庭${memberId}`;
    const direction = result.remainingAmount > 0
      ? `チーム会計へ${yen(result.remainingAmount)}をお願いします。`
      : result.remainingAmount < 0
        ? `チーム会計から${yen(Math.abs(result.remainingAmount))}をお返しします。`
        : "チーム会計とのやり取りはありません。";
    const text = `${displayDate(source.date)} ${source.destination}の遠征費（第${settlement.currentRevision.revision}版）：${name}の負担額${yen(result.burdenAmount)}、立替${yen(result.advanceAmount)}。${direction}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMemberId(memberId);
      setMessage(`${name}の連絡文をコピーしました。LINEなどに貼り付けて送ってください。`);
      window.setTimeout(() => setCopiedMemberId(null), 2000);
    } catch {
      setFormError("連絡文をコピーできませんでした");
    }
  };

  if (error) {
    return (
      <div className="app-page">
        <div className="app-container max-w-3xl">
          <div className="app-card p-6 text-sm text-red-700">精算情報を読み込めませんでした。</div>
        </div>
      </div>
    );
  }
  if (isLoading || !data) return <LoadingSpinner />;
  const visibleSettlement = data.settlement;

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
        <Link href={`/admin/teams/${teamId}/settlements`} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline print:hidden">
          <ArrowLeft size={16} /> 精算一覧へ戻る
        </Link>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-teal-700">遠征費精算</p>
            <span className={`app-status ${statusClass(visibleSettlement.status)}`}>{STATUS_LABELS[visibleSettlement.status]}</span>
          </div>
          <h1 className="app-section-title mt-1">{visibleSettlement.sourceDestination}</h1>
          <p className="mt-2 text-sm text-gray-600">{displayDate(visibleSettlement.sourceDate)} · この遠征全体の交通費をまとめて分担します。</p>
          {visibleSettlement.currentRevision && (
            <div className="mt-4 flex flex-wrap gap-2 print:hidden">
              {!visibleSettlement.draft && visibleSettlement.status !== "voiding" && visibleSettlement.status !== "voided" && (
                <button type="button" onClick={handleAmend} disabled={isChangingStatus} className="app-button-secondary px-3">
                  <Pencil size={16} /> 訂正する
                </button>
              )}
              <button type="button" onClick={() => window.print()} className="app-button-secondary px-3">
                <Printer size={16} /> 印刷
              </button>
            </div>
          )}
          {visibleSettlement.voidReason && <p className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">取消理由：{visibleSettlement.voidReason}</p>}
        </header>

        {(message || formError) && (
          <div
            role={formError ? "alert" : "status"}
            className={`mb-5 rounded-xl border p-4 text-sm leading-6 ${formError ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"}`}
          >
            {formError || message}
          </div>
        )}

        <SettlementBillingReturnNotice
          teamId={Number(teamId)}
          token={token}
          onActive={() => mutate()}
          onRefresh={() => mutate()}
        />

        {visibleSettlement.draft && visibleSettlement.access.state === "free_trial" && (
          <section className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
            <p className="font-bold">この遠征は無料体験の対象です</p>
            <p className="mt-1">初回確定まで編集でき、確定すると1チーム1遠征の無料枠を使用します。</p>
          </section>
        )}

        {visibleSettlement.draft && visibleSettlement.access.state === "subscription_required" && (
          <section className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-bold">
              {visibleSettlement.access.freeTrialConsumed ? "無料体験は利用済みです" : "無料体験は別の遠征で利用中です"}
            </p>
            <p className="mt-1">この下書きの編集・初回確定には、月{visibleSettlement.access.monthlyPrice.toLocaleString("ja-JP")}円／チームの精算プランが必要です。</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {!visibleSettlement.access.freeTrialConsumed && visibleSettlement.rideId && (
                <button type="button" onClick={handleMoveFreeTrial} disabled={isMovingFreeTrial} className="app-button-secondary bg-white">
                  {isMovingFreeTrial ? "変更中..." : "無料体験をこの遠征へ変更"}
                </button>
              )}
              {visibleSettlement.access.freeTrialSettlementId && visibleSettlement.access.freeTrialSettlementId !== visibleSettlement.id && (
                <Link href={`/admin/teams/${teamId}/settlements/${visibleSettlement.access.freeTrialSettlementId}`} className="app-button-secondary bg-white">
                  利用中の無料精算を見る
                </Link>
              )}
              <SettlementBillingButton
                teamId={Number(teamId)}
                token={token}
                returnPath={`/admin/teams/${teamId}/settlements/${settlementId}`}
                className="app-button-primary"
              >
                月{visibleSettlement.access.monthlyPrice.toLocaleString("ja-JP")}円の精算プランを始める
              </SettlementBillingButton>
            </div>
            <p className="mt-2 text-xs">保存済みの下書きは削除されません。</p>
          </section>
        )}

        {visibleSettlement.draft && visibleSettlement.access.state === "subscribed" && (
          <section className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
            <p className="font-bold">精算プランを利用中です</p>
            <p className="mt-1">このチームの遠征費精算を作成・編集できます。</p>
            <SettlementBillingButton
              teamId={Number(teamId)}
              token={token}
              returnPath={`/admin/teams/${teamId}/settlements/${settlementId}`}
              action="portal"
              className="app-button-secondary mt-3 bg-white"
            >
              支払い管理を開く
            </SettlementBillingButton>
          </section>
        )}

        {visibleSettlement.sourceChanged && visibleSettlement.draft && (
          <section className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-bold">精算を作成した後に配車内容が更新されています</p>
            <p className="mt-1">最新の参加者を取り込み直すか、現在表示している精算対象を確認してそのまま使ってください。</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={handleRefreshSource} disabled={isChangingStatus} className="app-button-secondary bg-white">最新の配車から再取込</button>
              <label className="flex cursor-pointer items-start gap-2 font-semibold">
                <input type="checkbox" checked={acceptSourceChanges} onChange={(event) => setAcceptSourceChanges(event.target.checked)} className="mt-1 h-4 w-4 accent-teal-700" />
                <span>現在の精算対象を確認し、このまま使う</span>
              </label>
            </div>
          </section>
        )}

        {isEditable && draft && (
          <div className="space-y-5">
            <section className="app-card p-4 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950"><WalletCards size={20} className="text-teal-700" />分担方法</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  ["equal", "家庭ごと均等", "対象家庭で同じ金額を負担します"],
                  ["byChildCount", "子どもの人数", "対象にした子どもの人数で分担します"],
                ] as const).map(([value, label, help]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-4 ${draft.allocationMethod === value ? "border-teal-600 bg-teal-50" : "border-gray-200 bg-white"}`}>
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="allocationMethod"
                        value={value}
                        checked={draft.allocationMethod === value}
                        onChange={() => updateDraft({ ...draft, allocationMethod: value })}
                        className="mt-1 h-4 w-4 accent-teal-700"
                      />
                      <span><span className="block font-semibold text-gray-950">{label}</span><span className="mt-1 block text-xs leading-5 text-gray-600">{help}</span></span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="app-card p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-950">負担する家庭・子ども</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">実際に費用を分担する家庭と子どもを確認してください。</p>
              <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
                {draft.families.map((family) => (
                  <div key={family.memberId} className="p-4">
                    <label className="flex cursor-pointer items-center gap-3 font-semibold text-gray-950">
                      <input
                        type="checkbox"
                        checked={family.isIncluded}
                        onChange={(event) => updateDraft({
                          ...draft,
                          families: draft.families.map((item) => item.memberId === family.memberId ? { ...item, isIncluded: event.target.checked } : item),
                        })}
                        className="h-5 w-5 shrink-0 rounded accent-teal-700"
                      />
                      {family.memberName}
                    </label>
                    {family.children.length > 0 && (
                      <div className="mt-3 grid gap-2 pl-8 sm:grid-cols-2">
                        {family.children.map((child) => (
                          <label key={child.childId} className="flex min-w-0 cursor-pointer items-start gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={child.isSelected}
                              onChange={(event) => updateDraft({
                                ...draft,
                                families: draft.families.map((item) => item.memberId === family.memberId ? {
                                  ...item,
                                  isIncluded: event.target.checked ? true : item.isIncluded,
                                  children: item.children.map((candidate) => candidate.childId === child.childId ? { ...candidate, isSelected: event.target.checked } : candidate),
                                } : item),
                              })}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-teal-700"
                            />
                            <span className="min-w-0 break-words">{child.childName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="app-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950"><ReceiptText size={20} className="text-teal-700" />費用明細</h2>
                  <p className="mt-1 text-sm text-gray-600">1明細につき1〜1,000,000円</p>
                </div>
                <button type="button" onClick={() => updateDraft({ ...draft, expenses: [...draft.expenses, newExpense()] })} className="app-button-secondary shrink-0 px-3">
                  <Plus size={17} /> 追加
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {draft.expenses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-600">費用明細を追加してください。</div>
                )}
                {draft.expenses.map((expense, index) => (
                  <fieldset key={expense.id} className="app-panel p-4">
                    <legend className="px-1 text-sm font-bold text-gray-900">明細 {index + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-gray-700">種別
                        <select value={expense.category} onChange={(event) => patchExpense(expense.id, { category: event.target.value as SettlementExpenseCategory })} className="app-select mt-1 w-full">
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label className="text-sm font-semibold text-gray-700">金額（円）
                        <input type="number" min={1} max={1_000_000} step={1} inputMode="numeric" value={expense.amount || ""} onChange={(event) => patchExpense(expense.id, { amount: event.target.value === "" ? 0 : Number(event.target.value) })} className="app-input mt-1" placeholder="例：3000" />
                      </label>
                      <label className="text-sm font-semibold text-gray-700 sm:col-span-2">立替元
                        <select value={expense.payerMemberId ?? "team"} onChange={(event) => patchExpense(expense.id, { payerMemberId: event.target.value === "team" ? null : Number(event.target.value) })} className="app-select mt-1 w-full">
                          <option value="team">チーム会計</option>
                          {draft.families.map((family) => <option key={family.memberId} value={family.memberId}>{family.memberName}</option>)}
                        </select>
                      </label>
                      <label className="text-sm font-semibold text-gray-700 sm:col-span-2">説明{expense.category === "other" ? "（必須）" : "（任意）"}
                        <input type="text" maxLength={200} value={expense.description} onChange={(event) => patchExpense(expense.id, { description: event.target.value })} className="app-input mt-1" placeholder="例：行きの高速代" />
                      </label>
                    </div>
                    <button type="button" onClick={() => updateDraft({ ...draft, expenses: draft.expenses.filter((item) => item.id !== expense.id) })} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-red-700">
                      <Trash2 size={16} /> この明細を削除
                    </button>
                  </fieldset>
                ))}
              </div>
            </section>

            <section className="app-card p-4 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950"><Calculator size={20} className="text-teal-700" />金額を確認</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleCalculate} className="app-button-secondary w-full">確認計算</button>
                <button type="button" onClick={handleSave} disabled={isSaving || isConfirming || !hasUnsavedChanges} className="app-button-secondary w-full">{isSaving ? "保存中..." : "下書き保存"}</button>
              </div>
              {preview && <SettlementSummary calculation={preview} familyNames={familyNames} />}
              {preview && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
                  {visibleSettlement.currentRevision && (
                    <label className="mb-4 block text-sm font-semibold text-gray-800">訂正理由
                      <textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} maxLength={500} className="app-input mt-1 min-h-20" placeholder="例：駐車場代の追加が判明したため" />
                    </label>
                  )}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={isAcknowledged} onChange={(event) => setIsAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-teal-700" />
                    <span>対象家庭と立替額を確認しました</span>
                  </label>
                  <button type="button" onClick={handleConfirm} disabled={isConfirming || isSaving || !isAcknowledged || Boolean(visibleSettlement.currentRevision && !correctionReason.trim()) || Boolean(visibleSettlement.sourceChanged && !acceptSourceChanges)} className="app-button-primary mt-3 w-full"><Check size={17} />{isConfirming ? "確定中..." : visibleSettlement.currentRevision ? "訂正版を確定" : "この金額で確定"}</button>
                </div>
              )}
            </section>
          </div>
        )}

        {!isEditable && displayCalculation && (
          <section className="app-card p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-950">家庭別の支払・返金</h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">実際に受領・返金してから記録してください。連絡文のコピーは送信済みを意味しません。</p>
            <SettlementSummary calculation={displayCalculation} familyNames={familyNames} />
            <div className="mt-5 space-y-3">
              {displayCalculation.families.map((family) => {
                const name = familyNames.get(family.memberId) ?? `家庭${family.memberId}`;
                return (
                  <div key={family.memberId} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-bold text-gray-950">{name}</p>
                        <p className={`mt-1 text-sm font-semibold ${family.remainingAmount > 0 ? "text-amber-800" : family.remainingAmount < 0 ? "text-blue-800" : "text-green-700"}`}>
                          {family.remainingAmount > 0 ? `${yen(family.remainingAmount)}を支払う` : family.remainingAmount < 0 ? `${yen(Math.abs(family.remainingAmount))}を受け取る` : "精算済み"}
                        </p>
                      </div>
                      <div className="grid w-full gap-2 sm:w-auto sm:min-w-72 sm:grid-cols-2 print:hidden">
                        <button type="button" onClick={() => copyFamilyMessage(family.memberId, family)} className="app-button-secondary w-full px-3">
                          <Clipboard size={16} /> {copiedMemberId === family.memberId ? "コピーしました" : "連絡文コピー"}
                        </button>
                        {family.remainingAmount !== 0 && visibleSettlement.status !== "voided" && (
                          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                            <label className="sr-only" htmlFor={`movement-${family.memberId}`}>{name}の記録額</label>
                            <input
                              id={`movement-${family.memberId}`}
                              type="number"
                              min={1}
                              max={Math.abs(family.remainingAmount)}
                              step={1}
                              inputMode="numeric"
                              value={movementAmounts[family.memberId] ?? Math.abs(family.remainingAmount)}
                              onChange={(event) => setMovementAmounts((current) => ({ ...current, [family.memberId]: event.target.value }))}
                              className="app-input"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const amount = Number(movementAmounts[family.memberId] ?? Math.abs(family.remainingAmount));
                                handleMovement(family.memberId, Math.sign(family.remainingAmount) * amount);
                              }}
                              disabled={movingMemberId !== null}
                              className="app-button-primary whitespace-nowrap px-3"
                            >
                              {movingMemberId === family.memberId ? "記録中..." : family.remainingAmount > 0 ? "受領を記録" : "返金を記録"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {visibleSettlement.currentRevision && visibleSettlement.movements.length > 0 && (
          <section className="app-card mt-5 p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950"><History size={19} className="text-teal-700" />受領・返金の記録</h2>
            <div className="mt-4 space-y-3">
              {visibleSettlement.movements.map((movement) => {
                const wasReversed = visibleSettlement.movements.some((item) => item.reversesMovementId === movement.id);
                const isReversal = movement.reversesMovementId !== null;
                return (
                  <div key={movement.id} className="rounded-xl border border-gray-200 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-gray-950">{movement.memberNameSnapshot}</p>
                      <p className="font-bold text-gray-950">{isReversal ? "記録取消" : movement.signedAmount > 0 ? "受領" : "返金"} {yen(Math.abs(movement.signedAmount))}</p>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{new Date(movement.createdAt).toLocaleString("ja-JP")}{isReversal ? " · 記録取消" : wasReversed ? " · 取消済み" : ""}</p>
                    {movement.note && <p className="mt-2 text-gray-700">理由：{movement.note}</p>}
                    {!isReversal && !wasReversed && visibleSettlement.status !== "voided" && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] print:hidden">
                        <input type="text" maxLength={200} value={reversalReasons[movement.id] ?? ""} onChange={(event) => setReversalReasons((current) => ({ ...current, [movement.id]: event.target.value }))} className="app-input" aria-label={`${movement.memberNameSnapshot}の記録取消理由`} placeholder="記録ミスの理由" />
                        <button type="button" onClick={() => handleReversal(movement)} disabled={!reversalReasons[movement.id]?.trim() || movingMemberId !== null} className="app-button-secondary text-red-700"><XCircle size={16} />記録を取り消す</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {visibleSettlement.revisions.length > 0 && (
          <section className="app-card mt-5 p-4 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-950"><History size={19} className="text-teal-700" />確定履歴</h2>
            <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
              {visibleSettlement.revisions.map((revision) => (
                <div key={revision.revision} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-gray-950">第{revision.revision}版</p>
                    <p className="font-bold text-gray-950">{yen(revision.totalAmount)}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{new Date(revision.createdAt).toLocaleString("ja-JP")}</p>
                  <p className="mt-1 text-xs text-gray-600">{displayDate(revision.snapshot.source.date)} · {revision.snapshot.source.destination}</p>
                  {revision.correctionReason && <p className="mt-2 text-sm text-gray-700">訂正理由：{revision.correctionReason}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {visibleSettlement.currentRevision && visibleSettlement.status !== "voiding" && visibleSettlement.status !== "voided" && !visibleSettlement.draft && (
          <details className="app-card mt-5 p-4 print:hidden sm:p-6">
            <summary className="cursor-pointer text-sm font-semibold text-red-700">この精算を取り消す</summary>
            <p className="mt-3 text-sm leading-6 text-gray-600">すでに受領・返金した金額があれば、取消後に元へ戻す記録が必要です。</p>
            <label className="mt-3 block text-sm font-semibold text-gray-700">取消理由
              <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} maxLength={500} className="app-input mt-1 min-h-20" placeholder="例：遠征が中止になったため" />
            </label>
            <button type="button" onClick={handleVoid} disabled={!voidReason.trim() || isChangingStatus} className="app-button-secondary mt-3 text-red-700"><XCircle size={16} />取消を開始</button>
          </details>
        )}
      </div>
    </div>
  );
}

function SettlementSummary({ calculation, familyNames }: { calculation: SettlementCalculationResult; familyNames: ReadonlyMap<number, string> }) {
  return (
    <div className="mt-5">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-950 p-4 text-white sm:grid-cols-3">
        <div><p className="text-xs text-gray-300">費用合計</p><p className="mt-1 text-xl font-bold">{yen(calculation.totalCost)}</p></div>
        <div><p className="text-xs text-gray-300">分担の重み</p><p className="mt-1 text-xl font-bold">{calculation.totalWeight}</p></div>
        <div className="col-span-2 sm:col-span-1"><p className="text-xs text-gray-300">チーム会計の立替</p><p className="mt-1 text-xl font-bold">{yen(calculation.teamAdvanceAmount)}</p></div>
      </div>
      <div className="mt-3 space-y-2">
        {calculation.families.map((family) => (
          <div key={family.memberId} className="rounded-xl border border-gray-200 p-4">
            <p className="break-words font-bold text-gray-950">{familyNames.get(family.memberId) ?? `家庭${family.memberId}`}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div><dt className="text-gray-500">負担額</dt><dd className="font-semibold text-gray-950">{yen(family.burdenAmount)}</dd></div>
              <div><dt className="text-gray-500">立替額</dt><dd className="font-semibold text-gray-950">{yen(family.advanceAmount)}</dd></div>
              <div><dt className="text-gray-500">記録済み</dt><dd className="font-semibold text-gray-950">{yen(family.receivedNetAmount)}</dd></div>
              <div><dt className="text-gray-500">現在の残額</dt><dd className="font-semibold text-gray-950">{yen(family.remainingAmount)}</dd></div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
