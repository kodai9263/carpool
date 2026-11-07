import { prisma } from "@/lib/prisma";
import type { VerifiedAppleSubscription } from "./types";
import { AppleBillingError } from "./types";
import { isAppleEnvironmentAllowed } from "@/utils/appleEnvironment";

type SubscriptionAccess = Pick<VerifiedAppleSubscription,
  "expiresAt" | "gracePeriodExpiresAt" | "revokedAt" | "isUpgraded"> & { status: string };

export function appleAccessExpiresAt(subscription: SubscriptionAccess): Date | null {
  if (subscription.revokedAt || subscription.isUpgraded) return null;
  if (subscription.status === "active") return subscription.expiresAt;
  if (subscription.status === "grace_period") return subscription.gracePeriodExpiresAt;
  return null;
}

export function shouldReplaceAppleSubscription(
  existing: SubscriptionAccess & { signedAt: Date },
  incoming: VerifiedAppleSubscription,
) {
  if (incoming.signedAt.getTime() < existing.signedAt.getTime()) return false;
  // 同時刻の再送で取消済み・アップグレード済みの取引を復活させない。
  if (incoming.signedAt.getTime() === existing.signedAt.getTime()) {
    if (existing.revokedAt && !incoming.revokedAt) return false;
    if (existing.status === "revoked" && incoming.status !== "revoked") return false;
    if (existing.isUpgraded && !incoming.isUpgraded) return false;
    const oldExpiry = appleAccessExpiresAt(existing)?.getTime() ?? 0;
    const newExpiry = appleAccessExpiresAt(incoming)?.getTime() ?? 0;
    if (newExpiry > oldExpiry) return false;
  }
  return true;
}

export async function saveAppleSubscription(adminId: number, incoming: VerifiedAppleSubscription) {
  return prisma.$transaction(async (tx) => {
    // Stripe更新・購入復元・通知を同じAdmin行で直列化する。
    await tx.$queryRaw`SELECT "id" FROM "Admin" WHERE "id" = ${adminId} FOR UPDATE`;
    const admin = await tx.admin.findUniqueOrThrow({ where: { id: adminId } });
    if (admin.supabaseUid.toLowerCase() !== incoming.appAccountToken.toLowerCase()) {
      throw new AppleBillingError("account_mismatch");
    }
    if (!isAppleEnvironmentAllowed(incoming.environment, admin.supabaseUid)) {
      throw new AppleBillingError("invalid_purchase");
    }
    const key = {
      environment_originalTransactionId: {
        environment: incoming.environment,
        originalTransactionId: incoming.originalTransactionId,
      },
    };
    const existing = await tx.appleSubscription.findUnique({ where: key });
    if (existing && (existing.adminId !== adminId || existing.appAccountToken.toLowerCase() !== admin.supabaseUid.toLowerCase())) {
      throw new AppleBillingError("account_mismatch");
    }
    if (!existing || shouldReplaceAppleSubscription(existing, incoming)) {
      const data = { ...incoming, appAccountToken: incoming.appAccountToken.toLowerCase(), adminId };
      // create競合をupsertのupdateで他の所有者へ付け替えない。unique違反なら取引全体を戻す。
      if (existing) await tx.appleSubscription.update({ where: { id: existing.id }, data });
      else await tx.appleSubscription.create({ data });
    }
    const subscriptions = await tx.appleSubscription.findMany({
      where: { adminId, appAccountToken: admin.supabaseUid.toLowerCase() },
    });
    const now = new Date();
    const eligible = subscriptions.filter((subscription) => isAppleEnvironmentAllowed(subscription.environment, admin.supabaseUid));
    // 後着のSandbox通知で本番契約を上書きしない。本番契約が存在する場合は失効後も検証契約へ戻さない。
    const environment = eligible.some((subscription) => subscription.environment === 'Production') ? 'Production' : incoming.environment;
    const activeUntil = eligible.filter((subscription) => subscription.environment === environment).reduce<Date | null>((latest, subscription) => {
      const expiresAt = appleAccessExpiresAt(subscription);
      return expiresAt && expiresAt > now && (!latest || expiresAt > latest) ? expiresAt : latest;
    }, null);
    await tx.admin.update({
      where: { id: adminId },
      data: {
        appleProExpiresAt: activeUntil,
        appleProEnvironment: environment,
        appleProAccountToken: admin.supabaseUid,
      },
    });
    return { active: Boolean(activeUntil), expiresAt: activeUntil };
  });
}

export async function applyAppleNotification(transaction: VerifiedAppleSubscription | null) {
  if (!transaction) return;
  const admin = await prisma.admin.findUnique({
    where: { supabaseUid: transaction.appAccountToken.toLowerCase() },
    select: { id: true },
  });
  // 削除済み・引継ぎ済みのアカウントを通知によって作り直さない。
  if (!admin) return;
  await saveAppleSubscription(admin.id, transaction);
}
