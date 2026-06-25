import type { AutoAssignBillingStatus } from "@/utils/billingServer";

export interface BillingStatusResponse {
  status: "OK";
  billing: {
    plan: "free" | "pro";
    isPro: boolean;
  };
  autoAssign: AutoAssignBillingStatus;
}
