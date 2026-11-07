/** @jest-environment node */
import {
  APIError, APIException, AppStoreServerAPIClient, SignedDataVerifier, VerificationException, VerificationStatus,
} from "@apple/app-store-server-library";
import { getAppleBillingConfig } from "../config";
import { normalizeVerifiedAppleTransaction, verifyAppleNotification, verifyApplePurchase } from "../verification";
import type { AppleBillingConfig } from "../types";

const mockDecodeTransaction = jest.fn();
const mockDecodeRenewal = jest.fn();
const mockDecodeNotification = jest.fn();
const mockGetTransaction = jest.fn();
const mockGetStatuses = jest.fn();
jest.mock("../config", () => ({
  ...jest.requireActual("../config"), getAppleBillingConfig: jest.fn(),
}));
jest.mock("@apple/app-store-server-library", () => ({
  ...jest.requireActual("@apple/app-store-server-library"),
  SignedDataVerifier: jest.fn().mockImplementation(() => ({
    verifyAndDecodeTransaction: (...args: unknown[]) => mockDecodeTransaction(...args),
    verifyAndDecodeRenewalInfo: (...args: unknown[]) => mockDecodeRenewal(...args),
    verifyAndDecodeNotification: (...args: unknown[]) => mockDecodeNotification(...args),
  })),
  AppStoreServerAPIClient: jest.fn().mockImplementation(() => ({
    getTransactionInfo: (...args: unknown[]) => mockGetTransaction(...args),
    getAllSubscriptionStatuses: (...args: unknown[]) => mockGetStatuses(...args),
  })),
}));

const now = Date.UTC(2026, 10, 7);
const owner = "11111111-1111-4111-8111-111111111111";
const another = "22222222-2222-4222-8222-222222222222";
const config: AppleBillingConfig = {
  environment: "Production", sandboxReviewAccountTokens: [], bundleId: "test.carpool.app", appAppleId: 123456789,
  subscriptionGroupId: "1234", products: { monthly: "test.pro.monthly", yearly: "test.pro.yearly" },
  keyId: "ABCDEFGHIJ", issuerId: owner, privateKey: "test-private-key-not-real",
};
const transaction = (overrides = {}) => ({
  bundleId: config.bundleId, environment: "Production", subscriptionGroupIdentifier: "1234",
  productId: config.products.monthly, type: "Auto-Renewable Subscription", inAppOwnershipType: "PURCHASED",
  transactionId: "1001", originalTransactionId: "1000", appAccountToken: owner,
  purchaseDate: now - 10000, expiresDate: now + 10000, signedDate: now - 5000,
  ...overrides,
});
const statusResponse = (status = 1, overrides = {}) => ({
  environment: "Production", bundleId: config.bundleId, appAppleId: config.appAppleId,
  data: [{ subscriptionGroupIdentifier: "1234", lastTransactions: [{
    originalTransactionId: "1000", status, signedTransactionInfo: "current.payload.signature", ...overrides,
  }] }],
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(now);
  (getAppleBillingConfig as jest.Mock).mockReturnValue(config);
  mockDecodeTransaction.mockReset().mockResolvedValue(transaction());
  mockDecodeRenewal.mockReset();
  mockDecodeNotification.mockReset();
  mockGetTransaction.mockReset().mockResolvedValue({ signedTransactionInfo: "original.payload.signature" });
  mockGetStatuses.mockReset().mockResolvedValue(statusResponse());
});
afterEach(() => jest.useRealTimers());

const sandboxJws = (notification = false) => `header.${Buffer.from(JSON.stringify(notification ? { data: { environment: 'Sandbox' } } : { environment: 'Sandbox' })).toString('base64url')}.signature`;
function reviewConfig() {
  (getAppleBillingConfig as jest.Mock).mockReturnValue({ ...config, sandboxReviewAccountTokens: [owner] });
  mockDecodeTransaction.mockResolvedValue(transaction({ environment: 'Sandbox' }));
  mockGetStatuses.mockResolvedValue({ ...statusResponse(), environment: 'Sandbox' });
}

test('許可した審査アカウントだけが本番サーバーでSandbox購入を検証できる', async () => {
  reviewConfig();
  expect(await verifyApplePurchase({ signedTransaction: sandboxJws() }, owner)).toMatchObject({ environment: 'Sandbox', appAccountToken: owner });
  expect(SignedDataVerifier).toHaveBeenLastCalledWith(expect.any(Array), true, 'Sandbox', config.bundleId, config.appAppleId);
  expect(mockGetStatuses).toHaveBeenCalledWith('1000');
});
test('クライアントがSandbox環境を指定しても通常アカウントには開放しない', async () => {
  reviewConfig();
  await expect(verifyApplePurchase({ signedTransaction: sandboxJws() }, another)).rejects.toMatchObject({ code: 'invalid_purchase' });
  expect(mockDecodeTransaction).not.toHaveBeenCalled();
  expect(mockGetStatuses).not.toHaveBeenCalled();
});
test('審査アカウントでもSandboxの署名不正と別所有者を拒否する', async () => {
  reviewConfig();
  mockDecodeTransaction.mockRejectedValueOnce(new VerificationException(VerificationStatus.VERIFICATION_FAILURE));
  await expect(verifyApplePurchase({ signedTransaction: sandboxJws() }, owner)).rejects.toMatchObject({ code: 'invalid_purchase' });
  mockDecodeTransaction.mockResolvedValueOnce(transaction({ environment: 'Sandbox', appAccountToken: another }));
  await expect(verifyApplePurchase({ signedTransaction: sandboxJws() }, owner)).rejects.toMatchObject({ code: 'account_mismatch' });
  expect(mockGetStatuses).not.toHaveBeenCalled();
});
test('審査アカウントのID復元はAppleの取引なし回答に限りSandboxを確認する', async () => {
  reviewConfig();
  mockGetTransaction.mockRejectedValueOnce(new APIException(404, APIError.TRANSACTION_ID_NOT_FOUND));
  expect(await verifyApplePurchase({ transactionId: '1001' }, owner)).toMatchObject({ environment: 'Sandbox' });
  expect(mockGetTransaction).toHaveBeenCalledTimes(2);
});
test.each([new APIException(503), new APIException(401), new Error('network')])('Apple障害時にSandboxへ切り替えない: %s', async (error) => {
  reviewConfig();
  mockGetTransaction.mockRejectedValueOnce(error);
  await expect(verifyApplePurchase({ transactionId: '1001' }, owner)).rejects.toMatchObject({ code: 'verification_unavailable' });
  expect(mockGetTransaction).toHaveBeenCalledTimes(1);
  expect(SignedDataVerifier).toHaveBeenCalledTimes(1);
});
test('通常アカウントはAppleの取引なし回答でもSandboxへ切り替えない', async () => {
  reviewConfig();
  mockGetTransaction.mockRejectedValueOnce(new APIException(404, APIError.TRANSACTION_ID_NOT_FOUND));
  await expect(verifyApplePurchase({ transactionId: '1001' }, another)).rejects.toMatchObject({ code: 'verification_unavailable' });
  expect(mockGetTransaction).toHaveBeenCalledTimes(1);
});
test('Sandbox通知はApple署名と署名内の許可された所有者を確認してから現在状態を取得する', async () => {
  reviewConfig();
  mockDecodeNotification.mockResolvedValue({ notificationUUID: owner, notificationType: 'DID_RENEW', signedDate: now, data: { signedTransactionInfo: sandboxJws() } });
  expect((await verifyAppleNotification(sandboxJws(true))).transaction?.environment).toBe('Sandbox');
  mockGetStatuses.mockClear();
  mockDecodeTransaction.mockResolvedValue(transaction({ environment: 'Sandbox', appAccountToken: another }));
  await expect(verifyAppleNotification(sandboxJws(true))).rejects.toMatchObject({ code: 'invalid_purchase' });
  expect(mockGetStatuses).not.toHaveBeenCalled();
});
test('Sandbox通知の署名を検証できなければ内部の購入情報を信用しない', async () => {
  reviewConfig();
  mockDecodeNotification.mockRejectedValue(new VerificationException(VerificationStatus.VERIFICATION_FAILURE));
  await expect(verifyAppleNotification(sandboxJws(true))).rejects.toMatchObject({ code: 'invalid_purchase' });
  expect(mockDecodeTransaction).not.toHaveBeenCalled();
});
test('許可リスト未設定ではSandbox通知を受理しない', async () => {
  await expect(verifyAppleNotification(sandboxJws(true))).rejects.toMatchObject({ code: 'invalid_purchase' });
  expect(mockDecodeNotification).not.toHaveBeenCalled();
});

test("IDからApple署名情報を取得し、購入者を照合して現在の契約を再取得する", async () => {
  const result = await verifyApplePurchase({ transactionId: "1001" }, owner);
  expect(mockGetTransaction).toHaveBeenCalledWith("1001");
  expect(mockGetStatuses).toHaveBeenCalledWith("1000");
  expect(mockDecodeTransaction.mock.calls).toEqual([["original.payload.signature"], ["current.payload.signature"]]);
  expect(result).toMatchObject({ appAccountToken: owner, status: "active", expiresAt: new Date(now + 10000) });
  expect(SignedDataVerifier).toHaveBeenCalledWith(expect.any(Array), true, "Production", config.bundleId, config.appAppleId);
});

test("古い有効なJWSを再送しても、現在の返金済み状態を採用する", async () => {
  mockDecodeTransaction.mockResolvedValueOnce(transaction())
    .mockResolvedValueOnce(transaction({ revocationDate: now - 1000, signedDate: now }));
  mockGetStatuses.mockResolvedValue(statusResponse(5));
  const result = await verifyApplePurchase({ signedTransaction: "old.payload.signature" }, owner);
  expect(result.status).toBe("revoked");
  expect(result.revokedAt).toEqual(new Date(now - 1000));
  expect(mockGetTransaction).not.toHaveBeenCalled();
});

test("署名が正しくても別アカウントの購入は現在状態の問い合わせ前に拒否する", async () => {
  await expect(verifyApplePurchase({ signedTransaction: "old.payload.signature" }, another))
    .rejects.toMatchObject({ code: "account_mismatch", status: 403 });
  expect(mockGetStatuses).not.toHaveBeenCalled();
});

test.each([
  { bundleId: "other.app" }, { environment: "Sandbox" }, { productId: "another.product" },
  { subscriptionGroupIdentifier: "5678" }, { inAppOwnershipType: "FAMILY_SHARED" },
  { appAccountToken: undefined }, { originalTransactionId: "invalid" },
  { signedDate: now + 300001 }, { expiresDate: -1 }, { purchaseDate: now + 20000 },
  { type: "Consumable" }, { revocationDate: -1 },
])("署名済み値でも対象外の情報は採用しない: %j", (overrides) => {
  expect(() => normalizeVerifiedAppleTransaction(transaction(overrides), config, now)).toThrow();
});

test("更新後の取引が別の所有者なら開放しない", async () => {
  mockDecodeTransaction.mockResolvedValueOnce(transaction()).mockResolvedValueOnce(transaction({ appAccountToken: another }));
  await expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "account_mismatch" });
});

test("Apple API障害時にクライアントの古い有効情報へフォールバックしない", async () => {
  mockGetStatuses.mockRejectedValue(new Error("secret request details"));
  await expect(verifyApplePurchase({ signedTransaction: "old.payload.signature" }, owner))
    .rejects.toMatchObject({ code: "verification_unavailable", status: 503 });
});

test("対象の購読がAppleの現在状態に見つからなければ開放しない", async () => {
  mockGetStatuses.mockResolvedValue({ ...statusResponse(), data: [] });
  await expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "verification_unavailable" });
});

test("不明なAppleステータスを有効扱いしない", async () => {
  mockGetStatuses.mockResolvedValue(statusResponse(99));
  await expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "invalid_purchase" });
});

test("自動更新をオフにしても、有効期限内の契約は有効なまま返す", async () => {
  mockGetStatuses.mockResolvedValue(statusResponse(1, { signedRenewalInfo: "renewal.payload.signature" }));
  mockDecodeRenewal.mockResolvedValue({ environment: "Production", originalTransactionId: "1000",
    productId: config.products.monthly, autoRenewStatus: 0, signedDate: now });
  const result = await verifyApplePurchase({ transactionId: "1001" }, owner);
  expect(result.status).toBe("active");
  expect(result.signedAt).toEqual(new Date(now));
});

test("猶予期間は署名済みの猶予期限を照合する", async () => {
  mockGetStatuses.mockResolvedValue(statusResponse(4, { signedRenewalInfo: "renewal.payload.signature" }));
  mockDecodeRenewal.mockResolvedValue({ environment: "Production", originalTransactionId: "1000",
    productId: config.products.monthly, signedDate: now, gracePeriodExpiresDate: now + 20000 });
  const result = await verifyApplePurchase({ transactionId: "1001" }, owner);
  expect(result).toMatchObject({ status: "grace_period", gracePeriodExpiresAt: new Date(now + 20000) });
  mockDecodeRenewal.mockResolvedValue({ environment: "Production", originalTransactionId: "other", signedDate: now });
  await expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "invalid_purchase" });
});

test("Sandboxは明示設定した場合だけ検証し、Productionへの自動切替を行わない", async () => {
  (getAppleBillingConfig as jest.Mock).mockReturnValue({ ...config, environment: "Sandbox" });
  mockDecodeTransaction.mockResolvedValue(transaction({ environment: "Sandbox" }));
  mockGetStatuses.mockResolvedValue({ ...statusResponse(), environment: "Sandbox" });
  await verifyApplePurchase({ transactionId: "1001" }, owner);
  expect(SignedDataVerifier).toHaveBeenCalledTimes(1);
  expect(SignedDataVerifier).toHaveBeenCalledWith(expect.any(Array), true, "Sandbox", config.bundleId, config.appAppleId);
});

test("未設定ではSDKを作らず購入を停止する", async () => {
  (getAppleBillingConfig as jest.Mock).mockReturnValue(null);
  await expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "not_configured" });
  expect(AppStoreServerAPIClient).not.toHaveBeenCalled();
});

test("不正署名と一時的な証明書確認障害を区別する", async () => {
  mockDecodeTransaction.mockRejectedValueOnce(new VerificationException(VerificationStatus.VERIFICATION_FAILURE));
  await expect(verifyApplePurchase({ signedTransaction: "fake.payload.signature" }, owner)).rejects.toMatchObject({ code: "invalid_purchase" });
  mockDecodeTransaction.mockRejectedValueOnce(new VerificationException(VerificationStatus.RETRYABLE_VERIFICATION_FAILURE));
  await expect(verifyApplePurchase({ signedTransaction: "fake.payload.signature" }, owner)).rejects.toMatchObject({ code: "verification_unavailable" });
});

test("確認が応答しなくても15秒で再試行可能なエラーになる", async () => {
  mockGetStatuses.mockReturnValue(new Promise(() => {}));
  const check = expect(verifyApplePurchase({ transactionId: "1001" }, owner)).rejects.toMatchObject({ code: "verification_unavailable" });
  await jest.advanceTimersByTimeAsync(15001);
  await check;
});

test("古い通知でも現在の契約を取得し、通知時刻で購読状態を巻き戻さない", async () => {
  mockDecodeNotification.mockResolvedValue({ notificationUUID: owner, notificationType: "DID_RENEW", signedDate: now - 50000,
    data: { signedTransactionInfo: "old.payload.signature" } });
  mockDecodeTransaction.mockResolvedValueOnce(transaction()).mockResolvedValueOnce(transaction({ transactionId: "1002", signedDate: now }));
  const result = await verifyAppleNotification("notification.payload.signature");
  expect(result.signedAt).toEqual(new Date(now - 50000));
  expect(result.transaction).toMatchObject({ transactionId: "1002", signedAt: new Date(now) });
  expect(mockGetStatuses).toHaveBeenCalledWith("1000");
});

test("署名検証済みTEST通知は購入を作らない", async () => {
  mockDecodeNotification.mockResolvedValue({ notificationUUID: owner, notificationType: "TEST", signedDate: now });
  expect(await verifyAppleNotification("notification.payload.signature")).toMatchObject({ transaction: null });
  expect(mockGetStatuses).not.toHaveBeenCalled();
});
