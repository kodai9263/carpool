"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { trackEvent } from "@/utils/analytics";
import { AUTO_ASSIGN_FREE_TRIAL_LIMIT, PRO_MONTHLY_PRICE_JPY, PRO_YEARLY_PRICE_JPY, type BillingInterval } from "@/utils/billing";

type Props = {
  open: boolean;
  onClose: () => void;
  onBeforeCheckout?: () => Promise<void>;
  returnPath: string;
  source: string;
  token?: string | null;
  isPaymentPending?: boolean;
};

export function UpgradeDialog({ open, onClose, onBeforeCheckout, returnPath, source, token, isPaymentPending = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open) {
      setError("");
      dialog?.showModal();
      trackEvent("upgrade_dialog_viewed", { source });
    } else {
      dialog?.close();
    }
  }, [open, source]);

  const checkout = async (interval: BillingInterval) => {
    if (busyRef.current || !token || isPaymentPending) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await onBeforeCheckout?.();
      trackEvent("upgrade_clicked", { source, interval });
      const result = await api.post("/api/admin/billing/checkout", { interval, returnPath, source }, token) as { url?: string; destination?: "checkout" | "portal" };
      if (!result.url) throw new Error("決済ページを開けませんでした。");
      trackEvent(result.destination === "portal" ? "billing_portal_redirected" : "checkout_redirected", { source, interval });
      window.location.assign(result.url);
    } catch (cause) {
      setError((cause as { message?: string })?.message || "決済ページを開けませんでした。もう一度お試しください。");
      trackEvent("checkout_failed", { source, interval });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} aria-labelledby="upgrade-title" aria-describedby="upgrade-description" onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={onClose} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-black/40">
      <h2 id="upgrade-title" className="text-xl font-bold text-gray-950">自動割り当て無制限はProで</h2>
      <p id="upgrade-description" className="mt-3 text-sm leading-6 text-gray-600">1チームの配車管理は無料で、自動割り当ては{AUTO_ASSIGN_FREE_TRIAL_LIMIT}回までお試しできます（再計算も1回）。Proでは自動割り当てを無制限で利用でき、同じアカウントで複数チームを管理できます。</p>
      {onBeforeCheckout && <p className="mt-3 text-sm leading-6 text-gray-600">入力内容をこのタブに一時保存してから決済画面へ進みます。戻った後に配車を確定できます。</p>}
      <div className="mt-5 space-y-3">
        <button type="button" onClick={() => checkout("month")} disabled={busy || !token || isPaymentPending} className="app-button-primary w-full">{busy ? "決済ページを準備中..." : `月${PRO_MONTHLY_PRICE_JPY.toLocaleString("ja-JP")}円でProを始める`}</button>
        <button type="button" onClick={() => checkout("year")} disabled={busy || !token || isPaymentPending} className="app-button-secondary w-full">年払い {PRO_YEARLY_PRICE_JPY.toLocaleString("ja-JP")}円/年</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-gray-500">月払い・年払いともに自動更新です。プロフィールの「支払い・解約を管理」から解約できます。お支払い総額は決済画面でご確認ください。</p>
      {isPaymentPending && <p role="status" className="mt-3 text-sm text-amber-800">前回のお支払いを確認しています。確認完了まで新しい申込みはお待ちください。</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={onClose} disabled={busy} className="app-button-secondary mt-5 w-full">今は閉じる</button>
    </dialog>
  );
}
