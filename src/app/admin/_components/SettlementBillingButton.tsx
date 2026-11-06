"use client";

import { useState, type ReactNode } from "react";
import type { SettlementBillingCheckoutResponse } from "@/app/_types/settlement";
import { api } from "@/utils/api";
import toast from "react-hot-toast";

type Props = {
  teamId: number;
  token?: string | null;
  returnPath: string;
  children?: ReactNode;
  className?: string;
  action?: "checkout" | "portal" | "legacy_portal";
};

export function SettlementBillingButton({
  teamId,
  token,
  returnPath,
  children = "月300円のProを始める",
  className = "app-button-primary",
  action = "checkout",
}: Props) {
  const [isOpening, setIsOpening] = useState(false);

  const openCheckout = async () => {
    if (!token || isOpening) return;
    setIsOpening(true);
    try {
      const endpoint = action === "legacy_portal"
        ? `/api/admin/teams/${teamId}/settlement-billing/portal`
        : action === "portal"
        ? "/api/admin/billing/portal"
        : "/api/admin/billing/checkout";
      const body = action === "checkout"
        ? { interval: "month", returnPath, source: "settlement" }
        : { returnPath };
      const result = await api.post(endpoint, body, token) as SettlementBillingCheckoutResponse;
      window.location.assign(result.url);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "Proの決済ページを開けませんでした。";
      toast.error(message);
      setIsOpening(false);
    }
  };

  return (
    <button type="button" onClick={openCheckout} disabled={!token || isOpening} className={className}>
      {isOpening ? "決済ページを準備中..." : children}
    </button>
  );
}
