import {
  AUTO_ASSIGN_FREE_TRIAL_LIMIT,
  createProTrialPeriod,
  getBillingPlanFromStripeStatus,
  getAutoAssignRemainingFreeUses,
  getProEntitlement,
  isProPlan,
  normalizeBillingPlan,
} from "../billing";

describe("billing helpers", () => {
  test("normalizes unknown plans to free", () => {
    expect(normalizeBillingPlan("pro")).toBe("pro");
    expect(normalizeBillingPlan("free")).toBe("free");
    expect(normalizeBillingPlan("unknown")).toBe("free");
    expect(normalizeBillingPlan(null)).toBe("free");
  });

  test("detects pro plans", () => {
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("free")).toBe(false);
    expect(isProPlan(undefined)).toBe(false);
  });

  test("calculates remaining auto assign trial uses", () => {
    expect(getAutoAssignRemainingFreeUses(0)).toBe(AUTO_ASSIGN_FREE_TRIAL_LIMIT);
    expect(getAutoAssignRemainingFreeUses(1)).toBe(AUTO_ASSIGN_FREE_TRIAL_LIMIT - 1);
    expect(getAutoAssignRemainingFreeUses(AUTO_ASSIGN_FREE_TRIAL_LIMIT)).toBe(0);
    expect(getAutoAssignRemainingFreeUses(AUTO_ASSIGN_FREE_TRIAL_LIMIT + 1)).toBe(0);
  });

  test("maps Stripe subscription statuses to billing plans", () => {
    expect(getBillingPlanFromStripeStatus("active")).toBe("pro");
    expect(getBillingPlanFromStripeStatus("trialing")).toBe("pro");
    expect(getBillingPlanFromStripeStatus("past_due")).toBe("free");
    expect(getBillingPlanFromStripeStatus("canceled")).toBe("free");
    expect(getBillingPlanFromStripeStatus(null)).toBe("free");
  });

  test("creates a 30 day Pro trial", () => {
    const now = new Date("2026-10-04T00:00:00.000Z");
    expect(createProTrialPeriod(now)).toEqual({
      proTrialStartedAt: now,
      proTrialEndsAt: new Date("2026-11-03T00:00:00.000Z"),
    });
  });

  test("uses paid Pro before trial and expires trial at the exact end time", () => {
    const now = new Date("2026-10-04T00:00:00.000Z");
    expect(getProEntitlement({ billingPlan: "pro", proTrialEndsAt: "2026-10-03T00:00:00.000Z" }, now))
      .toMatchObject({ isPro: true, isPaidPro: true, isTrialActive: false, accessSource: "paid" });
    expect(getProEntitlement({ billingPlan: "free", proTrialEndsAt: "2026-10-04T00:00:01.000Z" }, now))
      .toMatchObject({ isPro: true, isPaidPro: false, isTrialActive: true, accessSource: "trial", trialDaysRemaining: 1 });
    expect(getProEntitlement({ billingPlan: "free", proTrialEndsAt: now }, now))
      .toMatchObject({ isPro: false, isTrialActive: false, accessSource: "free", trialDaysRemaining: 0 });
  });
});
