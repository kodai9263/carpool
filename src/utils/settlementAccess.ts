import type { Prisma, TeamSettlementAccess } from "@prisma/client";

export const SETTLEMENT_MONTHLY_PRICE_JPY = 980;
export const SETTLEMENT_SUBSCRIPTION_REQUIRED = "SETTLEMENT_SUBSCRIPTION_REQUIRED";

export function isSettlementSubscriptionActive(status?: string | null) {
  return status === "active" || status === "trialing";
}

export type SettlementAccessReason = "trial_in_use" | "trial_used";

type AccessRecord = Pick<
  TeamSettlementAccess,
  "id" | "teamId" | "freeTrialSettlementId" | "freeTrialConsumedAt"
> & { subscriptionStatus?: string | null };

export class SettlementAccessError extends Error {
  readonly code = SETTLEMENT_SUBSCRIPTION_REQUIRED;

  constructor(
    readonly reason: SettlementAccessReason,
    readonly freeTrialSettlementId: number | null,
  ) {
    super(
      reason === "trial_in_use"
        ? "無料体験は別の遠征で利用中です。この遠征へ変更するか、月980円の精算プランをご利用ください。"
        : "無料体験は利用済みです。この遠征の精算を始めるには月980円の精算プランが必要です。",
    );
    this.name = "SettlementAccessError";
  }
}

export function settlementAccessErrorBody(error: SettlementAccessError) {
  return {
    code: error.code,
    reason: error.reason,
    freeTrialSettlementId: error.freeTrialSettlementId,
    monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
    message: error.message,
  };
}

/** 同じTeamの無料枠操作は、この行を最初にロックして直列化する。 */
export async function lockTeamSettlementAccess(
  tx: Prisma.TransactionClient,
  teamId: number,
): Promise<AccessRecord> {
  // Prismaのupsertは初回行を同時作成するとP2002になり得るため、DB側で競合を吸収する。
  await tx.$executeRaw`
    INSERT INTO "TeamSettlementAccess" ("teamId", "createdAt", "updatedAt")
    VALUES (${teamId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("teamId") DO NOTHING
  `;
  await tx.$queryRaw`SELECT "id" FROM "TeamSettlementAccess" WHERE "teamId" = ${teamId} FOR UPDATE`;
  const access = await tx.teamSettlementAccess.findUniqueOrThrow({
    where: { teamId },
    select: {
      id: true,
      teamId: true,
      freeTrialSettlementId: true,
      freeTrialConsumedAt: true,
    },
  });
  const subscription = await tx.teamSettlementSubscription.findUnique({
    where: { teamId },
    select: { stripeSubscriptionStatus: true },
  });
  return { ...access, subscriptionStatus: subscription?.stripeSubscriptionStatus ?? null };
}

/**
 * 初回確定前だけ無料対象を付け替えられる。旧下書きは消さず、再び対象に戻すか
 * 将来の有料契約で再開できる状態のまま保持する。
 */
export async function assignFreeTrialOrThrow(
  tx: Prisma.TransactionClient,
  access: AccessRecord,
  settlementId: number,
  allowMove: boolean,
): Promise<AccessRecord> {
  if (isSettlementSubscriptionActive(access.subscriptionStatus)) return access;
  if (access.freeTrialSettlementId === settlementId) return access;
  if (access.freeTrialConsumedAt) {
    throw new SettlementAccessError("trial_used", access.freeTrialSettlementId);
  }
  if (access.freeTrialSettlementId !== null && !allowMove) {
    throw new SettlementAccessError("trial_in_use", access.freeTrialSettlementId);
  }
  if (access.freeTrialSettlementId !== null) {
    const previous = await tx.rideSettlement.findFirst({
      where: { id: access.freeTrialSettlementId, teamId: access.teamId },
      select: { currentRevisionNumber: true },
    });
    if (!previous || previous.currentRevisionNumber !== null) {
      throw new SettlementAccessError("trial_used", access.freeTrialSettlementId);
    }
  }
  return tx.teamSettlementAccess.update({
    where: { id: access.id },
    data: { freeTrialSettlementId: settlementId },
    select: {
      id: true,
      teamId: true,
      freeTrialSettlementId: true,
      freeTrialConsumedAt: true,
    },
  });
}

export async function requireDraftAccess(
  tx: Prisma.TransactionClient,
  access: AccessRecord,
  settlement: { id: number; currentRevisionNumber: number | null },
): Promise<AccessRecord> {
  // 確定後の訂正は契約終了後も止めない。
  if (settlement.currentRevisionNumber !== null) return access;
  return assignFreeTrialOrThrow(tx, access, settlement.id, false);
}

export async function consumeFreeTrial(
  tx: Prisma.TransactionClient,
  access: AccessRecord,
  settlementId: number,
): Promise<void> {
  if (access.freeTrialSettlementId !== settlementId || access.freeTrialConsumedAt) {
    throw new SettlementAccessError(
      access.freeTrialConsumedAt ? "trial_used" : "trial_in_use",
      access.freeTrialSettlementId,
    );
  }
  const consumed = await tx.teamSettlementAccess.updateMany({
    where: {
      id: access.id,
      freeTrialSettlementId: settlementId,
      freeTrialConsumedAt: null,
    },
    data: { freeTrialConsumedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new SettlementAccessError("trial_used", access.freeTrialSettlementId);
  }
}

export function buildSettlementAccessView(
  settlement: {
    id: number;
    currentRevisionNumber: number | null;
    team: {
      settlementAccess: Pick<TeamSettlementAccess, "freeTrialSettlementId" | "freeTrialConsumedAt"> | null;
      settlementSubscription?: { stripeSubscriptionStatus: string | null } | null;
    };
  },
) {
  const access = settlement.team?.settlementAccess ?? null;
  if (settlement.currentRevisionNumber !== null) {
    return {
      state: "history" as const,
      canEdit: true,
      freeTrialSettlementId: access?.freeTrialSettlementId ?? null,
      freeTrialConsumed: Boolean(access?.freeTrialConsumedAt),
      monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
    };
  }
  const subscriptionStatus = settlement.team?.settlementSubscription?.stripeSubscriptionStatus ?? null;
  if (isSettlementSubscriptionActive(subscriptionStatus)) {
    return {
      state: "subscribed" as const,
      canEdit: true,
      freeTrialSettlementId: access?.freeTrialSettlementId ?? null,
      freeTrialConsumed: Boolean(access?.freeTrialConsumedAt),
      monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
      subscriptionStatus,
    };
  }
  const canEdit = access?.freeTrialSettlementId === settlement.id && !access.freeTrialConsumedAt;
  return {
    state: canEdit ? "free_trial" as const : "subscription_required" as const,
    canEdit,
    freeTrialSettlementId: access?.freeTrialSettlementId ?? null,
    freeTrialConsumed: Boolean(access?.freeTrialConsumedAt),
    monthlyPrice: SETTLEMENT_MONTHLY_PRICE_JPY,
    subscriptionStatus,
  };
}
