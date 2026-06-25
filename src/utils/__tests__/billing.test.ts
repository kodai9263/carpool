import {
  AUTO_ASSIGN_FREE_TRIAL_LIMIT,
  getBillingPlanFromStripeStatus,
  getAutoAssignRemainingFreeUses,
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
});
