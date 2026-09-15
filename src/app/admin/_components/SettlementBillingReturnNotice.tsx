"use client";

import { useEffect, useRef, useState } from "react";
import type { SettlementBillingVerificationResponse } from "@/app/_types/settlement";

type Props = {
  teamId: number;
  token?: string | null;
  onActive: () => unknown;
  onRefresh?: () => unknown;
};

export function SettlementBillingReturnNotice({ teamId, token, onActive, onRefresh }: Props) {
  const [message, setMessage] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onActive, onRefresh });
  callbacks.current = { onActive, onRefresh };

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("settlement_checkout");
    if (checkout === "cancel") {
      setMessage("決済画面から戻りました。精算プランの申込みを再開できます。");
      return;
    }
    if (params.get("settlement_portal") === "return") {
      setMessage("支払い管理画面から戻りました。契約状態を更新しています。");
      Promise.resolve(callbacks.current.onRefresh?.()).then(() => {
        setMessage("精算プランの契約状態を更新しました。");
      }).catch(() => {
        setMessage("契約状態を更新できませんでした。もう一度確認してください。");
        setRetryable(true);
      });
      return;
    }
    if (checkout !== "success") return;
    const sessionId = params.get("settlement_session_id");
    if (!sessionId) {
      setMessage("決済の確認情報がありません。重複して申し込まず、契約状態をご確認ください。");
      setRetryable(true);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      controller.abort();
      if (!cancelled) {
        cancelled = true;
        if (timer) clearTimeout(timer);
        setMessage("反映に時間がかかっています。重複して申し込まず、もう一度確認してください。");
        setRetryable(true);
      }
    }, 30000);
    setRetryable(false);
    setMessage("お支払いと精算プランの反映を確認しています…");
    const check = async () => {
      try {
        const response = await fetch(
          `/api/admin/teams/${teamId}/settlement-billing/checkout?session_id=${encodeURIComponent(sessionId)}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        if (!response.ok) throw new Error("決済状態を確認できませんでした");
        const result = await response.json() as SettlementBillingVerificationResponse;
        if (cancelled) return;
        if (result.active) {
          clearTimeout(deadline);
          setMessage("精算プランが有効になりました。精算を再開します。");
          await callbacks.current.onActive();
          return;
        }
        if (result.state === "expired") {
          clearTimeout(deadline);
          setMessage("お支払いの完了を確認できませんでした。申込みを再開できます。");
          return;
        }
        if (Date.now() - startedAt >= 30000) {
          setMessage("反映に時間がかかっています。重複して申し込まず、もう一度確認してください。");
          setRetryable(true);
          return;
        }
        timer = setTimeout(check, 2000);
      } catch {
        if (cancelled) return;
        clearTimeout(deadline);
        setMessage("決済状態を確認できませんでした。重複申込みを避けるため、もう一度確認してください。");
        setRetryable(true);
      }
    };
    void check();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(deadline);
      if (timer) clearTimeout(timer);
    };
  }, [teamId, token, attempt]);

  if (!message) return null;
  return (
    <div role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
      <p>{message}</p>
      {retryable && (
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="app-button-secondary mt-3">
          支払い状況を再確認
        </button>
      )}
    </div>
  );
}
