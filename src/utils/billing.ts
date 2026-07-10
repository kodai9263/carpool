export const FREE_TEAM_LIMIT = 1;
export const AUTO_ASSIGN_FREE_TRIAL_LIMIT = 3;
export const PRO_MONTHLY_PRICE_JPY = 300;
export const PRO_YEARLY_PRICE_JPY = 3000;

export type BillingInterval = "month" | "year";

export const PLAN_LABELS = {
  free: "Free",
  pro: "Pro",
} as const;

export type BillingPlan = keyof typeof PLAN_LABELS;

export function isSecondTeamCandidate(teamCount: number) {
  return teamCount >= FREE_TEAM_LIMIT;
}

export function normalizeBillingPlan(plan?: string | null): BillingPlan {
  return plan === "pro" ? "pro" : "free";
}

export function isProPlan(plan?: string | null) {
  return normalizeBillingPlan(plan) === "pro";
}

export function getAutoAssignRemainingFreeUses(used: number) {
  return Math.max(AUTO_ASSIGN_FREE_TRIAL_LIMIT - used, 0);
}

export function getBillingPlanFromStripeStatus(status?: string | null): BillingPlan {
  return status === "active" || status === "trialing" ? "pro" : "free";
}
