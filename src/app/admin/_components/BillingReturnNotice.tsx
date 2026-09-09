"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/utils/analytics";

type Props = {
  token?: string | null;
  onConfirmed: () => unknown;
  onPendingChange?: (pending: boolean) => void;
};
type Verification = { state: "pending" | "active" | "unpaid" | "expired"; isPro: boolean };

export function BillingReturnNotice({ token, onConfirmed, onPendingChange }: Props) {
  const [message, setMessage] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onConfirmed, onPendingChange });
  callbacks.current = { onConfirmed, onPendingChange };

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "cancel") {
      setMessage("決済画面から戻りました。申込みを再開できます。");
      callbacks.current.onPendingChange?.(false);
      return;
    }
    if (params.get("portal") === "return") {
      setRetryable(false);
      let cancelled = false;
      setMessage("支払い管理画面から戻りました。プラン情報を更新しています。");
      Promise.resolve().then(() => callbacks.current.onConfirmed()).then(() => {
        if (!cancelled) setMessage("支払い管理画面から戻りました。プラン情報を更新しました。");
      }).catch(() => {
        if (!cancelled) { setMessage("プラン情報を更新できませんでした。もう一度確認してください。"); setRetryable(true); }
      });
      return () => { cancelled = true; };
    }
    if (checkout !== "success") return;
    const sessionId = params.get("session_id");
    callbacks.current.onPendingChange?.(true);
    if (!sessionId) {
      setMessage("お支払いの確認情報がありません。プロフィールでプランをご確認ください。重複した申込みはお控えください。");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    const controller = new AbortController();
    const deadline = setTimeout(() => {
      controller.abort();
      if (!cancelled) {
        cancelled = true;
        if (timer) clearTimeout(timer);
        setMessage("プランの反映に時間がかかっています。再度申し込まず、しばらくしてから確認してください。");
        setRetryable(true);
      }
    }, 30000);
    setRetryable(false);
    setMessage("お支払いとProプランの反映を確認しています…");
    const check = async () => {
      try {
        const response = await fetch(`/api/admin/billing/checkout?session_id=${encodeURIComponent(sessionId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("支払い状況を確認できませんでした。");
        const result = await response.json() as Verification;
        if (cancelled) return;
        if (result.state === "active" && result.isPro) {
          await callbacks.current.onConfirmed();
          if (cancelled) return;
          clearTimeout(deadline);
          callbacks.current.onPendingChange?.(false);
          setMessage("Proプランが有効になりました。自動割り当てを利用できます。");
          trackEvent("checkout_confirmed", { source: "billing_return" });
          return;
        }
        if (result.state === "unpaid" || result.state === "expired") {
          clearTimeout(deadline);
          callbacks.current.onPendingChange?.(false);
          setMessage("お支払いの完了を確認できませんでした。支払い状況を確認してから申込みを再開してください。");
          return;
        }
        if (Date.now() - started >= 30000) {
          setMessage("プランの反映に時間がかかっています。再度申し込まず、しばらくしてから確認してください。");
          setRetryable(true);
          return;
        }
        timer = setTimeout(check, 2000);
      } catch {
        if (cancelled) return;
        clearTimeout(deadline);
        setMessage("お支払い状況を確認できませんでした。重複した申込みを避けるため、もう一度確認してください。");
        setRetryable(true);
      }
    };
    void check();
    return () => { cancelled = true; controller.abort(); clearTimeout(deadline); if (timer) clearTimeout(timer); };
  }, [token, attempt]);

  if (!message) return null;
  return <div role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950"><p>{message}</p>{retryable && <button type="button" onClick={() => setAttempt((value) => value + 1)} className="app-button-secondary mt-3">支払い状況を再確認</button>}</div>;
}
