/** @jest-environment node */
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getProEntitlement } from '@/utils/billing';
import { saveAppleSubscription } from '../service';
import type { VerifiedAppleSubscription } from '../types';

// 明示指定された専用ローカルDBだけで実行する。本番URLでは必ず停止する。
const enabled = process.env.CARPOOL_APPLE_DB_TEST === 'true';
if (enabled) {
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (target.hostname !== '127.0.0.1' || target.port !== '55437' || !target.pathname.startsWith('/carpool_apple_test')) {
    throw new Error('Apple integration tests require the isolated local test database');
  }
}
const integration = enabled ? describe : describe.skip;
let transactionSequence = BigInt(Date.now()) * BigInt(100);

integration('Apple契約の実DB保存', () => {
  let admin: Awaited<ReturnType<typeof prisma.admin.create>>;
  let other: typeof admin;
  let purchase: VerifiedAppleSubscription;
  const environmentBefore = process.env.APPLE_IAP_ENVIRONMENT;
  const reviewAccountsBefore = process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS;

  beforeAll(() => { process.env.APPLE_IAP_ENVIRONMENT = 'Production'; });
  beforeEach(async () => {
    delete process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS;
    const uid = randomUUID();
    const otherUid = randomUUID();
    admin = await prisma.admin.create({ data: { email: `${uid}@example.test`, supabaseUid: uid } });
    other = await prisma.admin.create({ data: { email: `${otherUid}@example.test`, supabaseUid: otherUid } });
    const id = String(++transactionSequence);
    purchase = {
      environment: 'Production', originalTransactionId: id, transactionId: id,
      productId: 'test.carpool.monthly', appAccountToken: uid,
      expiresAt: new Date(Date.now() + 86400000), revokedAt: null,
      signedAt: new Date(), status: 'active', isUpgraded: false, gracePeriodExpiresAt: null,
    };
  });
  afterAll(async () => {
    if (environmentBefore === undefined) delete process.env.APPLE_IAP_ENVIRONMENT;
    else process.env.APPLE_IAP_ENVIRONMENT = environmentBefore;
    if (reviewAccountsBefore === undefined) delete process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS;
    else process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = reviewAccountsBefore;
    await prisma.$disconnect();
  });

  test('同じ取引の同時復元は1行だけ保存し、確定済みのProを返す', async () => {
    const results = await Promise.all(Array.from({ length: 3 }, () => saveAppleSubscription(admin.id, purchase)));
    expect(results.every((result) => result.active)).toBe(true);
    expect(await prisma.appleSubscription.count({ where: { adminId: admin.id } })).toBe(1);
    const saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(getProEntitlement(saved).isPaidPro).toBe(true);
  });

  test('所有者の違う復元で取引を付け替えない', async () => {
    await saveAppleSubscription(admin.id, purchase);
    await expect(saveAppleSubscription(other.id, { ...purchase, appAccountToken: other.supabaseUid })).rejects.toMatchObject({ code: 'account_mismatch' });
    expect(await prisma.appleSubscription.findFirst({ where: { originalTransactionId: purchase.originalTransactionId } })).toMatchObject({ adminId: admin.id });
    expect(await prisma.admin.findUnique({ where: { id: other.id } })).toMatchObject({ appleProExpiresAt: null });
  });

  test('返金後の古い取引の再送でProを復活させない', async () => {
    await saveAppleSubscription(admin.id, purchase);
    await saveAppleSubscription(admin.id, { ...purchase, status: 'revoked', revokedAt: new Date(), signedAt: new Date(purchase.signedAt.getTime() + 1000) });
    await saveAppleSubscription(admin.id, purchase);
    const saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(saved.appleProExpiresAt).toBeNull();
    expect(getProEntitlement(saved).isPaidPro).toBe(false);
  });

  test('Web契約が終了しても、別管理のApple有効契約を消さない', async () => {
    await prisma.admin.update({ where: { id: admin.id }, data: { billingPlan: 'pro' } });
    await saveAppleSubscription(admin.id, purchase);
    const saved = await prisma.admin.update({ where: { id: admin.id }, data: { billingPlan: 'free', stripeSubscriptionStatus: 'canceled' } });
    expect(getProEntitlement(saved).isPaidPro).toBe(true);
  });

  test('1契約が返金されても別の有効なApple契約の期限を維持する', async () => {
    const secondId = String(++transactionSequence);
    const second = { ...purchase, originalTransactionId: secondId, transactionId: secondId, expiresAt: new Date(purchase.expiresAt.getTime() + 86400000) };
    await saveAppleSubscription(admin.id, purchase);
    await saveAppleSubscription(admin.id, second);
    await saveAppleSubscription(admin.id, { ...purchase, status: 'revoked', revokedAt: new Date(), signedAt: new Date(purchase.signedAt.getTime() + 1000) });
    const saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(saved.appleProExpiresAt).toEqual(second.expiresAt);
  });

  test('担当者の引継ぎでApple契約を別アカウントに渡さない', async () => {
    await saveAppleSubscription(admin.id, purchase);
    const saved = await prisma.admin.update({ where: { id: admin.id }, data: { supabaseUid: randomUUID() } });
    expect(getProEntitlement(saved).isPaidPro).toBe(false);
    await expect(saveAppleSubscription(admin.id, purchase)).rejects.toMatchObject({ code: 'account_mismatch' });
  });

  test('匿名・ログイン済みの直接アクセスは契約と権限キャッシュを変更できない', async () => {
    const protections = await prisma.$queryRaw<{ name: string; rls: boolean; anonymous_write: boolean; user_write: boolean }[]>`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
        has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE') AS anonymous_write,
        has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') AS user_write
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('Admin', 'AppleSubscription')
    `;
    expect(protections).toHaveLength(2);
    for (const protection of protections) expect(protection).toMatchObject({ rls: true, anonymous_write: false, user_write: false });
  });

  test('SandboxとProductionの通知が並行しても本番契約を優先し返金後にSandboxへ戻さない', async () => {
    process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = admin.supabaseUid;
    const sandboxId = String(++transactionSequence);
    const sandbox = { ...purchase, environment: 'Sandbox' as const, originalTransactionId: sandboxId, transactionId: sandboxId,
      expiresAt: new Date(purchase.expiresAt.getTime() + 86400000) };
    await Promise.all([saveAppleSubscription(admin.id, sandbox), saveAppleSubscription(admin.id, purchase)]);
    let saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(saved).toMatchObject({ appleProEnvironment: 'Production', appleProExpiresAt: purchase.expiresAt });
    const revoked = { ...purchase, status: 'revoked' as const, revokedAt: new Date(), signedAt: new Date(purchase.signedAt.getTime() + 1000) };
    await Promise.all([saveAppleSubscription(admin.id, revoked), saveAppleSubscription(admin.id, sandbox)]);
    saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(saved).toMatchObject({ appleProEnvironment: 'Production', appleProExpiresAt: null });
    expect(getProEntitlement(saved).isPaidPro).toBe(false);
  });

  test('審査専用Sandbox契約は許可を外すとキャッシュが残っていても使用できない', async () => {
    process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS = admin.supabaseUid;
    const sandbox = { ...purchase, environment: 'Sandbox' as const };
    await saveAppleSubscription(admin.id, sandbox);
    const saved = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    expect(getProEntitlement(saved).isPaidPro).toBe(true);
    delete process.env.APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS;
    expect(getProEntitlement(saved).isPaidPro).toBe(false);
    await expect(saveAppleSubscription(admin.id, sandbox)).rejects.toMatchObject({ code: 'invalid_purchase' });
  });
});
