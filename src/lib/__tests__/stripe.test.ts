/** @jest-environment node */
import { getValidatedStripeProPriceId, getValidatedStripeSettlementPrice } from "../stripe";
import Stripe from "stripe";
jest.mock("stripe", () => jest.fn());
const retrieve = jest.fn();
const productRetrieve = jest.fn();
beforeAll(() => {
  (Stripe as unknown as jest.Mock).mockImplementation(() => ({
    prices: { retrieve },
    products: { retrieve: productRetrieve },
  }));
});
beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.VERCEL_ENV;
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
  process.env.STRIPE_PRO_PRICE_ID = "price_month";
  process.env.STRIPE_PRO_YEARLY_PRICE_ID = "price_year";
  process.env.STRIPE_SETTLEMENT_PRICE_ID = "price_settlement";
  productRetrieve.mockResolvedValue({ id: "prod_settlement", active: true });
});
afterAll(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_PRO_PRICE_ID;
  delete process.env.STRIPE_PRO_YEARLY_PRICE_ID;
  delete process.env.STRIPE_SETTLEMENT_PRICE_ID;
});
test.each([["month", 300], ["year", 3000]] as const)("%sの公開料金と一致するPriceだけ使用する", async (interval, amount) => {
  retrieve.mockResolvedValue({ id: `price_${interval}`, active: true, currency: "jpy", unit_amount: amount, type: "recurring", recurring: { interval, interval_count: 1 } });
  await expect(getValidatedStripeProPriceId(interval)).resolves.toBe(`price_${interval}`);
});
test("Webhook未設定ではPrice取得すら行わない", async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await expect(getValidatedStripeProPriceId("month")).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
  expect(retrieve).not.toHaveBeenCalled();
});
test.each([
  { currency: "usd" }, { unit_amount: 3000 }, { active: false },
  { recurring: { interval: "year", interval_count: 1 } },
  { recurring: { interval: "month", interval_count: 3 } },
])("表示と違う料金設定は拒否: %j", async (change) => {
  retrieve.mockResolvedValue({ id: "price_month", active: true, currency: "jpy", unit_amount: 300, type: "recurring", recurring: { interval: "month", interval_count: 1 }, ...change });
  await expect(getValidatedStripeProPriceId("month")).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
});


test("Vercel本番ではテストモードの料金を使用しない", async () => {
  process.env.VERCEL_ENV = "production";
  retrieve.mockResolvedValue({ id: "price_month", active: true, livemode: false, currency: "jpy", unit_amount: 300, type: "recurring", recurring: { interval: "month", interval_count: 1 } });
  await expect(getValidatedStripeProPriceId("month")).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
  delete process.env.VERCEL_ENV;
});

test("精算プランは有効な月980円の商品だけ使用する", async () => {
  retrieve.mockResolvedValue({
    id: "price_settlement",
    product: "prod_settlement",
    active: true,
    currency: "jpy",
    unit_amount: 980,
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
  });
  await expect(getValidatedStripeSettlementPrice()).resolves.toEqual({
    priceId: "price_settlement",
    productId: "prod_settlement",
  });
});

test.each([
  { currency: "usd" },
  { unit_amount: 98000 },
  { active: false },
  { recurring: { interval: "year", interval_count: 1 } },
])("精算プランの料金設定不一致を拒否: %j", async (change) => {
  retrieve.mockResolvedValue({
    id: "price_settlement",
    product: "prod_settlement",
    active: true,
    currency: "jpy",
    unit_amount: 980,
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
    ...change,
  });
  await expect(getValidatedStripeSettlementPrice()).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
});

test("無効な精算商品を拒否する", async () => {
  retrieve.mockResolvedValue({
    id: "price_settlement",
    product: "prod_settlement",
    active: true,
    currency: "jpy",
    unit_amount: 980,
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
  });
  productRetrieve.mockResolvedValueOnce({ id: "prod_settlement", active: false });
  await expect(getValidatedStripeSettlementPrice()).rejects.toMatchObject({ code: "BILLING_UNAVAILABLE" });
});
