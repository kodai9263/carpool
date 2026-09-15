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
  action?: "checkout" | "portal";
};

export function SettlementBillingButton({
  teamId,
  token,
  returnPath,
  children = "月980円の精算プランを始める",
  className = "app-button-primary",
  action = "checkout",
}: Props) {
  const [isOpening, setIsOpening] = useState(false);

  const openCheckout = async () => {
    if (!token || isOpening) return;
    setIsOpening(true);
    try {
      const result = await api.post(
        `/api/admin/teams/${teamId}/settlement-billing/${action}`,
        { returnPath },
        token,
      ) as SettlementBillingCheckoutResponse;
      window.location.assign(result.url);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "精算プランの決済ページを開けませんでした。";
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
