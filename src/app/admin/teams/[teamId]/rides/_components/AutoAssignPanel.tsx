'use client';

import { useState, useEffect, useRef, useId } from "react";
import { WalletCards, Wand2 } from "lucide-react";
import type { AutoAssignBillingStatus } from "@/utils/billingServer";
import { PRO_MONTHLY_PRICE_JPY } from "@/utils/billing";
import { trackEvent } from "@/utils/analytics";

export interface AutoAssignOptions {
  numberOfCars?: number;
  separateParentChild: boolean;
}

interface Props {
  onAssign: (options: AutoAssignOptions) => Promise<void>;
  isAssigning: boolean;
  error: { message: string; minimumCars?: number } | null;
  defaultNumberOfCars?: number; // 配車可能な台数（初期値・上限として使用）
  billingStatus?: AutoAssignBillingStatus;
  onUpgradeClick: () => void;
  onRequestAnswers?: () => void;
  isPaymentPending?: boolean;
  analyticsKey?: string;
  assignmentSummary?: { children: number; cars: number } | null;
}

export default function AutoAssignPanel({
  onAssign,
  isAssigning,
  error,
  defaultNumberOfCars,
  billingStatus,
  onUpgradeClick,
  onRequestAnswers,
  isPaymentPending = false,
  analyticsKey,
  assignmentSummary,
}: Props) {
  const numberOfCarsId = useId();
  const [numberOfCarsInput, setNumberOfCarsInput] = useState<string>("");
  const [separateParentChild, setSeparateParentChild] = useState<boolean>(false);
  const isLimitReached = Boolean(billingStatus && !billingStatus.canUseAutoAssign);
  const hasDrivers = (defaultNumberOfCars ?? 0) > 0;
  const isFree = Boolean(billingStatus && !billingStatus.isPro && !billingStatus.isExempt);
  const panelRef = useRef<HTMLDivElement>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!isFree || !analyticsKey || !panelRef.current || typeof IntersectionObserver === "undefined") return;
    const state = isLimitReached ? "limit" : "trial";
    const key = `${analyticsKey}:${state}`;
    if (seen.current.has(key)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.current.add(key);
      trackEvent("auto_assign_offer_viewed", { source: "ride_auto_assign", offer_state: state, ride_id: analyticsKey });
      observer.disconnect();
    }, { threshold: 0.25 });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, [isFree, isLimitReached, analyticsKey]);

  // データ取得後に配車可能台数を初期値としてセット
  useEffect(() => {
    if (defaultNumberOfCars !== undefined && numberOfCarsInput === "") {
      setNumberOfCarsInput(String(defaultNumberOfCars));
    }
  }, [defaultNumberOfCars]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNumberOfCarsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (
      defaultNumberOfCars !== undefined &&
      val !== "" &&
      Number(val) > defaultNumberOfCars
    ) {
      setNumberOfCarsInput(String(defaultNumberOfCars));
    } else {
      setNumberOfCarsInput(val);
    }
  };

  const handleSubmit = async () => {
    if (isAssigning || isLimitReached || !hasDrivers || !billingStatus) return;
    const numberOfCars =
      numberOfCarsInput !== "" && !isNaN(Number(numberOfCarsInput))
        ? Number(numberOfCarsInput)
        : undefined;
    await onAssign({ numberOfCars, separateParentChild });
  };

  const handleRetryWithMinimum = async (minimumCars: number) => {
    if (isAssigning || isLimitReached || !hasDrivers || !billingStatus) return;
    setNumberOfCarsInput(String(minimumCars));
    await onAssign({ numberOfCars: minimumCars, separateParentChild });
  };

  return (
    <div ref={panelRef} className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/80 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Wand2 size={18} className="text-teal-700" />
        <span className="text-sm font-semibold text-teal-800">自動割り当て</span>
        {billingStatus && !isFree && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-teal-700">
            {billingStatus.isPro ? "Pro・回数制限なし" : "デモ・回数制限なし"}
          </span>
        )}
      </div>

      {!hasDrivers && (
        <div className="rounded-lg bg-white p-3 text-sm text-gray-700">
          <p>まずは車を出せる保護者の回答を集めましょう。</p>
          {onRequestAnswers && (
            <button type="button" onClick={onRequestAnswers} className="app-button-secondary mt-3 w-full">
              回答を依頼
            </button>
          )}
        </div>
      )}

      {assignmentSummary && (
        <div role="status" className="rounded-lg border border-teal-200 bg-white p-3 text-sm text-teal-950">
          <p className="font-semibold">{assignmentSummary.children}人・{assignmentSummary.cars}台の配車案を作成しました</p>
          <p className="mt-1 leading-6">まだ保存されていません。下の割り当てを確認し、「変更を更新」で保存してください。</p>
          <a href="#ride-save" className="app-button-secondary mt-3 inline-flex">保存ボタンへ進む</a>
        </div>
      )}

      {billingStatus && isFree && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            isLimitReached
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-teal-100 bg-white/70 text-teal-900"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <WalletCards size={17} className={isLimitReached ? "mt-0.5 shrink-0 text-amber-700" : "mt-0.5 shrink-0 text-teal-700"} />
              <div>
                <p className="font-semibold">
                  お試し残り{billingStatus.remaining}回
                </p>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  無料は{billingStatus.freeLimit}回まで。再計算も1回として数えます。
                </p>
              </div>
            </div>
            {isFree && (
              <button
                type="button"
                onClick={onUpgradeClick}
                disabled={isPaymentPending || isAssigning}
                className={`${isLimitReached ? "app-button-primary" : "app-button-secondary"} shrink-0`}
              >
                {isPaymentPending ? "契約状況を確認中" : `月${PRO_MONTHLY_PRICE_JPY}円で続ける`}
              </button>
            )}
          </div>
        </div>
      )}

      <details className="rounded-lg border border-teal-100 bg-white/70">
        <summary className="cursor-pointer px-3 py-3 text-sm text-teal-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
          <span className="font-semibold">配車の条件</span>
          <span className="ml-2 text-xs text-gray-600">
            {numberOfCarsInput === "" ? "台数は自動計算" : `${numberOfCarsInput}台`}
            {" ・ "}{separateParentChild ? "親子は別々の車" : "親子の指定なし"}
          </span>
        </summary>
        <fieldset disabled={isAssigning || isLimitReached || !hasDrivers || !billingStatus} className="space-y-3 px-3 pb-3 disabled:opacity-60">
          {/* 台数入力 */}
          <div className="flex items-center gap-3">
            <label htmlFor={numberOfCarsId} className="text-sm text-gray-700 w-16 shrink-0">台数</label>
            <input
              id={numberOfCarsId}
              type="number"
              min={1}
              max={defaultNumberOfCars}
              value={numberOfCarsInput}
              onChange={handleNumberOfCarsChange}
              placeholder="自動計算"
              className="app-input w-28 py-2 text-sm"
            />
            <span className="text-xs text-gray-500">
              空欄で自動計算（最大{defaultNumberOfCars ?? "-"}台）
            </span>
          </div>

          {/* 親子分乗 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-16 shrink-0">親子</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={separateParentChild}
                onChange={(e) => setSeparateParentChild(e.target.checked)}
                className="accent-teal-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">親子を別々の車にする</span>
            </label>
          </div>
        </fieldset>
      </details>

      {/* 実行ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isAssigning || isLimitReached || !hasDrivers || !billingStatus}
        className="app-button-primary w-full"
      >
        {isAssigning ? "配車案を作成中..." : !billingStatus ? "プランを確認中..." : isFree && !isLimitReached ? "無料で配車案を作る" : "自動割り当てを実行"}
      </button>

      {/* エラー表示（消えないインライン） */}
      {error && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error.message}</p>
          {error.minimumCars && (
            <button
              type="button"
              onClick={() => handleRetryWithMinimum(error.minimumCars!)}
              disabled={isAssigning || isLimitReached || !hasDrivers || !billingStatus}
              className="text-xs font-medium text-red-700 underline hover:text-red-900 disabled:opacity-50"
            >
              {error.minimumCars}台で実行する
            </button>
          )}
        </div>
      )}
    </div>
  );
}
