import { prisma } from "@/lib/prisma";
import {
  AUTO_ASSIGN_FREE_TRIAL_LIMIT,
  getAutoAssignRemainingFreeUses,
  getProEntitlement,
  type ProAccessSource,
} from "@/utils/billing";

export type AutoAssignBillingStatus = {
  plan: "free" | "pro";
  isPro: boolean;
  isPaidPro?: boolean;
  isTrialActive?: boolean;
  accessSource?: ProAccessSource;
  trialEndsAt?: string | null;
  trialDaysRemaining?: number;
  isExempt: boolean;
  freeLimit: number;
  used: number;
  remaining: number;
  canUseAutoAssign: boolean;
};

const billingExcludedAdminIds =
  process.env.BILLING_EXCLUDED_ADMIN_IDS ??
  process.env.ANALYTICS_EXCLUDED_ADMIN_IDS ??
  "4";

function isExcludedBillingAdmin(adminId: number) {
  return billingExcludedAdminIds
    .split(",")
    .map((id) => Number(id.trim()))
    .some((id) => Number.isInteger(id) && id === adminId);
}

export async function getAutoAssignBillingStatus(adminId: number): Promise<AutoAssignBillingStatus> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { billingPlan: true, proTrialEndsAt: true, autoAssignTrialUsed: true },
  });

  const entitlement = getProEntitlement({
    billingPlan: admin?.billingPlan,
    proTrialEndsAt: admin?.proTrialEndsAt,
  });
  const used = Math.max(admin?.autoAssignTrialUsed ?? 0, 0);
  const isExempt = isExcludedBillingAdmin(adminId);
  const remaining = getAutoAssignRemainingFreeUses(used);

  return {
    plan: entitlement.plan,
    isPro: entitlement.isPro,
    isPaidPro: entitlement.isPaidPro,
    isTrialActive: entitlement.isTrialActive,
    accessSource: entitlement.accessSource,
    trialEndsAt: entitlement.trialEndsAt?.toISOString() ?? null,
    trialDaysRemaining: entitlement.trialDaysRemaining,
    isExempt,
    freeLimit: AUTO_ASSIGN_FREE_TRIAL_LIMIT,
    used,
    remaining,
    canUseAutoAssign: entitlement.isPro || isExempt || remaining > 0,
  };
}

export async function consumeAutoAssignFreeUse(adminId: number): Promise<AutoAssignBillingStatus> {
  const current = await getAutoAssignBillingStatus(adminId);
  if (current.isPro || current.isExempt) return current;

  await prisma.admin.update({
    where: { id: adminId },
    data: { autoAssignTrialUsed: { increment: 1 } },
  });

  return getAutoAssignBillingStatus(adminId);
}
