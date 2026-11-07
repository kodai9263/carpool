/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { appleAccessExpiresAt, applyAppleNotification, saveAppleSubscription, shouldReplaceAppleSubscription } from "../service";
import type { VerifiedAppleSubscription } from "../types";

jest.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: jest.fn(), $queryRaw: jest.fn(),
  admin: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  appleSubscription: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
} }));

const account = "11111111-1111-4111-8111-111111111111";
const originalEnv = process.env;
const transaction: VerifiedAppleSubscription = {
  environment: "Production", originalTransactionId: "100", transactionId: "101", productId: "pro.month",
  appAccountToken: account, status: "active", expiresAt: new Date(Date.now() + 86400000),
  gracePeriodExpiresAt: null, revokedAt: null, signedAt: new Date("2026-11-07T00:00:00Z"), isUpgraded: false,
};

beforeEach(() => {
  process.env = { ...originalEnv, APPLE_IAP_ENVIRONMENT: 'Production', APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS: '' };
  jest.resetAllMocks();
  (prisma.$transaction as jest.Mock).mockImplementation((fn) => fn(prisma));
  (prisma.admin.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 9, supabaseUid: account });
  (prisma.appleSubscription.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([transaction]);
});
afterEach(() => { process.env = originalEnv; });

test('本番契約があれば遅れて届いたSandbox通知で本番期限を消さない', async () => {
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = account;
  const sandbox = { ...transaction, environment: 'Sandbox' as const, status: 'expired' as const };
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([transaction, sandbox]);
  await saveAppleSubscription(9, sandbox);
  expect(prisma.admin.update).toHaveBeenCalledWith({ where: { id: 9 }, data: {
    appleProExpiresAt: transaction.expiresAt, appleProEnvironment: 'Production', appleProAccountToken: account,
  } });
});
test('本番契約が返金された後に古いSandbox契約へ戻さない', async () => {
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = account;
  const revoked = { ...transaction, status: 'revoked' as const, revokedAt: new Date() };
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([revoked, { ...transaction, environment: 'Sandbox' }]);
  await expect(saveAppleSubscription(9, revoked)).resolves.toEqual({ active: false, expiresAt: null });
  expect(prisma.admin.update).toHaveBeenCalledWith({ where: { id: 9 }, data: {
    appleProExpiresAt: null, appleProEnvironment: 'Production', appleProAccountToken: account,
  } });
});
test('Sandboxのみの審査アカウントは許可時のみ保存できる', async () => {
  const sandbox = { ...transaction, environment: 'Sandbox' as const };
  await expect(saveAppleSubscription(9, sandbox)).rejects.toMatchObject({ code: 'invalid_purchase' });
  expect(prisma.appleSubscription.create).not.toHaveBeenCalled();
  process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = account;
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([sandbox]);
  await expect(saveAppleSubscription(9, sandbox)).resolves.toEqual({ active: true, expiresAt: transaction.expiresAt });
});
test('専用Sandbox環境ではProduction履歴があってもSandboxだけを集計する', async () => {
  process.env.APPLE_IAP_ENVIRONMENT = 'Sandbox';
  const sandbox = { ...transaction, environment: 'Sandbox' as const, expiresAt: new Date(transaction.expiresAt.getTime() + 1000) };
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([transaction, sandbox]);
  await expect(saveAppleSubscription(9, sandbox)).resolves.toEqual({ active: true, expiresAt: sandbox.expiresAt });
});

test("購入を保存し、Stripeの状態を書き換えずAppleの最大期限だけを集計する", async () => {
  const longer = new Date(transaction.expiresAt.getTime() + 86400000);
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([transaction, { ...transaction, expiresAt: longer }]);
  await expect(saveAppleSubscription(9, transaction)).resolves.toEqual({ active: true, expiresAt: longer });
  expect(prisma.$queryRaw).toHaveBeenCalled();
  expect(prisma.appleSubscription.create).toHaveBeenCalledTimes(1);
  expect(prisma.admin.update).toHaveBeenCalledWith({ where: { id: 9 }, data: {
    appleProExpiresAt: longer, appleProEnvironment: "Production", appleProAccountToken: account,
  } });
});
test("別アカウントでの保存はデータ更新前に拒否する", async () => {
  await expect(saveAppleSubscription(9, { ...transaction, appAccountToken: "other" })).rejects.toMatchObject({ code: "account_mismatch" });
  expect(prisma.appleSubscription.create).not.toHaveBeenCalled();
  expect(prisma.admin.update).not.toHaveBeenCalled();
});
test("同じ元取引を異なるAdminへ移し替えない", async () => {
  (prisma.appleSubscription.findUnique as jest.Mock).mockResolvedValue({ ...transaction, adminId: 10 });
  await expect(saveAppleSubscription(9, transaction)).rejects.toMatchObject({ code: "account_mismatch" });
  expect(prisma.appleSubscription.update).not.toHaveBeenCalled();
});
test("古い通知が遅れて届いても返金済みの契約を巻き戻さない", async () => {
  const revoked = { ...transaction, id: 1, adminId: 9, status: "revoked", revokedAt: new Date(), signedAt: new Date(transaction.signedAt.getTime() + 1000) };
  (prisma.appleSubscription.findUnique as jest.Mock).mockResolvedValue(revoked);
  (prisma.appleSubscription.findMany as jest.Mock).mockResolvedValue([revoked]);
  await expect(saveAppleSubscription(9, transaction)).resolves.toEqual({ active: false, expiresAt: null });
  expect(prisma.appleSubscription.update).not.toHaveBeenCalled();
});
test.each(["revoked", "expired", "billing_retry"])("同じ署名時刻の%s状態をactiveへ戻さない", (status) => {
  expect(shouldReplaceAppleSubscription({ ...transaction, status }, transaction)).toBe(false);
});
test("同時刻のactiveからrevokedへは反映する", () => {
  expect(shouldReplaceAppleSubscription(transaction, { ...transaction, status: "revoked" })).toBe(true);
});
test("grace periodは検証された猶予期限のみを使用する", () => {
  const grace = new Date(transaction.expiresAt.getTime() + 1000);
  expect(appleAccessExpiresAt({ ...transaction, status: "grace_period", gracePeriodExpiresAt: grace })).toBe(grace);
  expect(appleAccessExpiresAt({ ...transaction, status: "grace_period" })).toBeNull();
  expect(appleAccessExpiresAt({ ...transaction, isUpgraded: true })).toBeNull();
});
test("削除済み・引継ぎ済みの購入者を通知で再作成しない", async () => {
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue(null);
  await applyAppleNotification(transaction);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
