import { isAppleEnvironmentAllowed } from "./appleEnvironment";

export const FREE_TEAM_LIMIT = 1;
export const AUTO_ASSIGN_FREE_TRIAL_LIMIT = 3;
export const PRO_MONTHLY_PRICE_JPY = 300;
export const PRO_YEARLY_PRICE_JPY = 3000;
export const PRO_TRIAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingInterval = "month" | "year";

export const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
} as const;

export type BillingPlan = keyof typeof PLAN_LABELS;
export type ProAccessSource = "paid" | "trial" | "free";

export type ProEntitlement = {
  plan: BillingPlan;
  isPro: boolean;
  isPaidPro: boolean;
  isTrialActive: boolean;
  accessSource: ProAccessSource;
  trialEndsAt: Date | null;
  trialDaysRemaining: number;
};

export function isSecondTeamCandidate(teamCount: number) {
  return teamCount >= FREE_TEAM_LIMIT;
}

export function normalizeBillingPlan(plan?: string | null): BillingPlan {
  return plan === "pro" ? "pro" : "free";
}

export function isProPlan(plan?: string | null) {
  return normalizeBillingPlan(plan) === "pro";
}

export function createProTrialPeriod(now = new Date()) {
  return {
    proTrialStartedAt: now,
    proTrialEndsAt: new Date(now.getTime() + PRO_TRIAL_DAYS * DAY_MS),
  };
}

export type ProEntitlementInput = {
  billingPlan?: string | null;
  proTrialEndsAt?: Date | string | null;
  appleProExpiresAt?: Date | string | null;
  appleProEnvironment?: string | null;
  appleProAccountToken?: string | null;
  supabaseUid?: string | null;
};

export const appleProSelect = {
  appleProExpiresAt: true,
  appleProEnvironment: true,
  appleProAccountToken: true,
  supabaseUid: true,
} as const;

export function hasAppleProAccess(input: ProEntitlementInput, now = new Date()) {
  const expiresAt = input.appleProExpiresAt ? new Date(input.appleProExpiresAt).getTime() : 0;
  // 担当者の引継ぎでAdminの所有者が変わっても、元の購入者の契約を渡さない。
  return isAppleEnvironmentAllowed(input.appleProEnvironment, input.supabaseUid) && Boolean(input.supabaseUid) &&
    input.appleProAccountToken === input.supabaseUid && expiresAt > now.getTime();
}

export function getProEntitlement(
  input: ProEntitlementInput,
  now = new Date(),
): ProEntitlement {
  const isPaidPro = isProPlan(input.billingPlan) || hasAppleProAccess(input, now);
  const parsedTrialEndsAt = input.proTrialEndsAt ? new Date(input.proTrialEndsAt) : null;
  const trialEndsAt = parsedTrialEndsAt && !Number.isNaN(parsedTrialEndsAt.getTime())
    ? parsedTrialEndsAt
    : null;
  const remainingMs = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0;
  const isTrialActive = !isPaidPro && remainingMs > 0;
  const isPro = isPaidPro || isTrialActive;
  return {
    plan: isPro ? "pro" : "free",
    isPro,
    isPaidPro,
    isTrialActive,
    accessSource: isPaidPro ? "paid" : isTrialActive ? "trial" : "free",
    trialEndsAt,
    trialDaysRemaining: isTrialActive ? Math.ceil(remainingMs / DAY_MS) : 0,
  };
}

export function getAutoAssignRemainingFreeUses(used: number) {
  return Math.max(AUTO_ASSIGN_FREE_TRIAL_LIMIT - used, 0);
}

export function getBillingPlanFromStripeStatus(status?: string | null): BillingPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}
