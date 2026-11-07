import type { AutoAssignBillingStatus } from "@/utils/billingServer";
import type { ProAccessSource } from "@/utils/billing";

export interface BillingStatusResponse {
  status: "OK";
  billing: {
    plan: "free" | "pro";
    isPro: boolean;
    isPaidPro?: boolean;
    // Webの自動配車結果からのキャッシュ更新では省略可。スマホ側は必須booleanを実行時検証する。
    mobileAccess?: boolean;
    isTrialActive?: boolean;
    accessSource?: ProAccessSource;
    trialEndsAt?: string | null;
    trialDaysRemaining?: number;
  };
  autoAssign: AutoAssignBillingStatus;
}

export interface BillingPortalResponse {
  status: "OK";
  url: string;
}
