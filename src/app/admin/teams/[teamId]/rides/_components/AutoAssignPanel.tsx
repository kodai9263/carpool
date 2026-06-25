'use client';

import { useState, useEffect } from "react";
import { WalletCards, Wand2 } from "lucide-react";
import type { AutoAssignBillingStatus } from "@/utils/billingServer";

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
}

export default function AutoAssignPanel({
  onAssign,
  isAssigning,
  error,
  defaultNumberOfCars,
  billingStatus,
  onUpgradeClick,
}: Props) {
  const [numberOfCarsInput, setNumberOfCarsInput] = useState<string>("");
  const [separateParentChild, setSeparateParentChild] = useState<boolean>(false);
  const isLimitReached = Boolean(billingStatus && !billingStatus.canUseAutoAssign);

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
    const numberOfCars =
      numberOfCarsInput !== "" && !isNaN(Number(numberOfCarsInput))
        ? Number(numberOfCarsInput)
        : undefined;
    await onAssign({ numberOfCars, separateParentChild });
  };

  const handleRetryWithMinimum = async (minimumCars: number) => {
    setNumberOfCarsInput(String(minimumCars));
    await onAssign({ numberOfCars: minimumCars, separateParentChild });
  };

  return (
    <div className="space-y-4 rounded-xl border border-teal-200 bg-teal-50/80 p-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-teal-700" />
        <span className="text-sm font-semibold text-teal-800">自動割り当て</span>
      </div>

      {billingStatus && (
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
                {billingStatus.isPro ? (
                  <p className="font-semibold">Proプランで自動割り当てを無制限に使えます。</p>
                ) : billingStatus.isExempt ? (
                  <p className="font-semibold">デモでは自動割り当てを制限なしで試せます。</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      自動割り当てのお試し残り{billingStatus.remaining}回
                    </p>
                    <p className="mt-1 text-xs leading-5 opacity-80">
                      Freeでは{billingStatus.freeLimit}回まで試せます。Proで無制限になります。
                    </p>
                  </>
                )}
              </div>
            </div>
            {isLimitReached && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="app-button-secondary shrink-0 border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
              >
                Proプランを見る
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* 台数入力 */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 w-16 shrink-0">台数</label>
          <input
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
      </div>

      {/* 実行ボタン */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isAssigning || isLimitReached}
        className="app-button-primary w-full"
      >
        {isAssigning ? "割り当て中..." : "自動割り当てを実行"}
      </button>

      {/* エラー表示（消えないインライン） */}
      {error && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error.message}</p>
          {error.minimumCars && (
            <button
              type="button"
              onClick={() => handleRetryWithMinimum(error.minimumCars!)}
              disabled={isAssigning}
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
