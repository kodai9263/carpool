'use client';

import { useState } from "react";
import { Wand2 } from "lucide-react";

export interface AutoAssignOptions {
  numberOfCars?: number;
  separateParentChild: boolean;
}

interface Props {
  onAssign: (options: AutoAssignOptions) => Promise<void>;
  isAssigning: boolean;
  error: { message: string; minimumCars?: number } | null;
}

export default function AutoAssignPanel({ onAssign, isAssigning, error }: Props) {
  const [numberOfCarsInput, setNumberOfCarsInput] = useState<string>("");
  const [separateParentChild, setSeparateParentChild] = useState<boolean>(false);

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
    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-teal-700" />
        <span className="text-sm font-semibold text-teal-800">自動割り当て</span>
      </div>

      <div className="space-y-3">
        {/* 台数入力 */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 w-16 shrink-0">台数</label>
          <input
            type="number"
            min={1}
            value={numberOfCarsInput}
            onChange={(e) => setNumberOfCarsInput(e.target.value)}
            placeholder="自動計算"
            className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <span className="text-xs text-gray-500">空欄で自動計算</span>
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
        disabled={isAssigning}
        className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-medium rounded-md transition-colors"
      >
        {isAssigning ? "割り当て中..." : "自動割り当てを実行"}
      </button>

      {/* エラー表示（消えないインライン） */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 space-y-2">
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
