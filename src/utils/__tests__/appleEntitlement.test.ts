import { getProEntitlement, hasAppleProAccess } from "../billing";

const now = new Date("2026-11-07T00:00:00Z");
const apple = {
  billingPlan: "free", supabaseUid: "account-a", appleProAccountToken: "account-a",
  appleProEnvironment: "Production", appleProExpiresAt: new Date("2026-12-07T00:00:00Z"),
};
const originalEnv = process.env;
beforeEach(() => { process.env = { ...originalEnv, APPLE_IAP_ENVIRONMENT: 'Production', APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS: '' }; });
afterEach(() => { process.env = originalEnv; });

test('審査用Sandbox権利は専用UUIDの許可を外すと即座に無効になる', () => {
  const uid = '11111111-1111-4111-8111-111111111111';
  const review = { ...apple, supabaseUid: uid, appleProAccountToken: uid, appleProEnvironment: 'Sandbox' };
  expect(hasAppleProAccess(review, now)).toBe(false);
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = uid;
  expect(hasAppleProAccess(review, now)).toBe(true);
  expect(hasAppleProAccess({ ...review, supabaseUid: '22222222-2222-4222-8222-222222222222' }, now)).toBe(false);
  delete process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS;
  expect(hasAppleProAccess(review, now)).toBe(false);
});

test("Apple有効契約はWeb無料体験と別にpaid Proとして全機能を開放する", () => {
  expect(getProEntitlement(apple, now)).toMatchObject({ isPro: true, isPaidPro: true, accessSource: "paid", isTrialActive: false });
});
test("Stripeがfreeへ戻っても有効なApple契約は残る", () => {
  expect(getProEntitlement({ ...apple, billingPlan: "free" }, now).isPaidPro).toBe(true);
  expect(getProEntitlement({ ...apple, appleProExpiresAt: null, billingPlan: "pro" }, now).isPaidPro).toBe(true);
});
test("Appleが期限を迎えたらWebhookが来なくてもProを終了する", () => {
  expect(getProEntitlement(apple, new Date("2026-12-07T00:00:00Z")).isPaidPro).toBe(false);
});
test("期限切れ後でもWeb無料体験が残っている間はWebのみ利用可", () => {
  expect(getProEntitlement({ ...apple, appleProExpiresAt: now, proTrialEndsAt: new Date("2026-11-08T00:00:00Z") }, now))
    .toMatchObject({ isPro: true, isPaidPro: false, accessSource: "trial" });
});
test("Sandboxの期限キャッシュをProductionで使用しない", () => {
  expect(hasAppleProAccess({ ...apple, appleProEnvironment: "Sandbox" }, now)).toBe(false);
  process.env.APPLE_IAP_ENVIRONMENT = "Sandbox";
  expect(hasAppleProAccess({ ...apple, appleProEnvironment: "Sandbox" }, now)).toBe(true);
  expect(hasAppleProAccess(apple, now)).toBe(false);
});
test("担当者変更・所有者不明・無効な期限ではAppleの権限を渡さない", () => {
  expect(hasAppleProAccess({ ...apple, supabaseUid: "account-b" }, now)).toBe(false);
  expect(hasAppleProAccess({ ...apple, supabaseUid: undefined }, now)).toBe(false);
  expect(hasAppleProAccess({ ...apple, appleProExpiresAt: "not-a-date" }, now)).toBe(false);
});
