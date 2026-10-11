export interface AdminMeResponse {
  status: 'OK';
  admin: {
    id: number;
    email: string;
    pendingTransferNewEmail: string | null;
    billingPlan: string;
    proTrialStartedAt: string | null;
    proTrialEndsAt: string | null;
    autoAssignTrialUsed: number;
    stripeSubscriptionStatus: string | null;
    hasBillingCustomer?: boolean;
    proAccess: {
      isPro: boolean;
      isPaidPro: boolean;
      isTrialActive: boolean;
      accessSource: "paid" | "trial" | "free";
      trialEndsAt: string | null;
      trialDaysRemaining: number;
    };
  };
}
