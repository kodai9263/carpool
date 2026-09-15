import {
  assignFreeTrialOrThrow,
  buildSettlementAccessView,
  consumeFreeTrial,
  lockTeamSettlementAccess,
  requireDraftAccess,
  SettlementAccessError,
} from "@/utils/settlementAccess";

function access(overrides: Partial<{
  id: number;
  teamId: number;
  freeTrialSettlementId: number | null;
  freeTrialConsumedAt: Date | null;
  subscriptionStatus: string | null;
}> = {}) {
  return {
    id: 1,
    teamId: 2,
    freeTrialSettlementId: null,
    freeTrialConsumedAt: null,
    ...overrides,
  };
}

function transaction() {
  return {
    teamSettlementAccess: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    teamSettlementSubscription: { findUnique: jest.fn().mockResolvedValue(null) },
    $executeRaw: jest.fn(),
    rideSettlement: { findFirst: jest.fn() },
    $queryRaw: jest.fn(),
  };
}

test("チームの無料枠行を競合を吸収して作成してから行ロックし、最新値を返す", async () => {
  const tx = transaction();
  const current = access({ freeTrialSettlementId: 10 });
  tx.teamSettlementAccess.findUniqueOrThrow.mockResolvedValue(current);

  await expect(lockTeamSettlementAccess(tx as never, 2)).resolves.toEqual({
    ...current,
    subscriptionStatus: null,
  });

  expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
  expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  expect(tx.teamSettlementAccess.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
    where: { teamId: 2 },
  }));
});

test("未使用なら最初の精算を無料対象に割り当てる", async () => {
  const tx = transaction();
  const assigned = access({ freeTrialSettlementId: 20 });
  tx.teamSettlementAccess.update.mockResolvedValue(assigned);

  await expect(assignFreeTrialOrThrow(tx as never, access(), 20, false)).resolves.toEqual(assigned);
  expect(tx.teamSettlementAccess.update).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: 1 },
    data: { freeTrialSettlementId: 20 },
  }));
});

test("別遠征で予約中なら明示的な移動なしでは開始させない", async () => {
  const tx = transaction();

  await expect(assignFreeTrialOrThrow(
    tx as never,
    access({ freeTrialSettlementId: 19 }),
    20,
    false,
  )).rejects.toMatchObject({
    name: "SettlementAccessError",
    reason: "trial_in_use",
    freeTrialSettlementId: 19,
  });
  expect(tx.rideSettlement.findFirst).not.toHaveBeenCalled();
});

test("移動元が未確定なら無料対象を別遠征へ移せる", async () => {
  const tx = transaction();
  const assigned = access({ freeTrialSettlementId: 20 });
  tx.rideSettlement.findFirst.mockResolvedValue({ currentRevisionNumber: null });
  tx.teamSettlementAccess.update.mockResolvedValue(assigned);

  await expect(assignFreeTrialOrThrow(
    tx as never,
    access({ freeTrialSettlementId: 19 }),
    20,
    true,
  )).resolves.toEqual(assigned);
  expect(tx.rideSettlement.findFirst).toHaveBeenCalledWith({
    where: { id: 19, teamId: 2 },
    select: { currentRevisionNumber: true },
  });
});

test("移動元が確定済みなら無料枠を再利用させない", async () => {
  const tx = transaction();
  tx.rideSettlement.findFirst.mockResolvedValue({ currentRevisionNumber: 1 });

  await expect(assignFreeTrialOrThrow(
    tx as never,
    access({ freeTrialSettlementId: 19 }),
    20,
    true,
  )).rejects.toMatchObject({ reason: "trial_used" });
  expect(tx.teamSettlementAccess.update).not.toHaveBeenCalled();
});

test("初回確定時だけ対象の無料枠を消化する", async () => {
  const tx = transaction();
  tx.teamSettlementAccess.updateMany.mockResolvedValue({ count: 1 });

  await consumeFreeTrial(tx as never, access({ freeTrialSettlementId: 20 }), 20);

  expect(tx.teamSettlementAccess.updateMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ freeTrialSettlementId: 20, freeTrialConsumedAt: null }),
    data: { freeTrialConsumedAt: expect.any(Date) },
  }));
});

test("確定済み精算の訂正は無料枠の状態にかかわらず許可する", async () => {
  const tx = transaction();
  const consumed = access({ freeTrialSettlementId: 19, freeTrialConsumedAt: new Date() });

  await expect(requireDraftAccess(
    tx as never,
    consumed,
    { id: 19, currentRevisionNumber: 1 },
  )).resolves.toEqual(consumed);
  expect(tx.teamSettlementAccess.update).not.toHaveBeenCalled();
});

test("表示状態を無料下書き・要契約・確定履歴に分ける", () => {
  expect(buildSettlementAccessView({
    id: 20,
    currentRevisionNumber: null,
    team: { settlementAccess: access({ freeTrialSettlementId: 20 }) },
  })).toMatchObject({ state: "free_trial", canEdit: true, monthlyPrice: 980 });

  expect(buildSettlementAccessView({
    id: 20,
    currentRevisionNumber: null,
    team: { settlementAccess: access({ freeTrialSettlementId: 19 }) },
  })).toMatchObject({ state: "subscription_required", canEdit: false });

  expect(buildSettlementAccessView({
    id: 19,
    currentRevisionNumber: 1,
    team: { settlementAccess: access({ freeTrialSettlementId: 19, freeTrialConsumedAt: new Date() }) },
  })).toMatchObject({ state: "history", canEdit: true, freeTrialConsumed: true });
});

test("無料枠消化後は別遠征に割り当てない", async () => {
  const tx = transaction();
  const used = access({ freeTrialSettlementId: 19, freeTrialConsumedAt: new Date() });

  await expect(assignFreeTrialOrThrow(tx as never, used, 20, true)).rejects.toBeInstanceOf(SettlementAccessError);
  expect(tx.teamSettlementAccess.update).not.toHaveBeenCalled();
});

test("精算プラン契約中は無料枠を動かさず別遠征を編集できる", async () => {
  const tx = transaction();
  const subscribed = access({
    freeTrialSettlementId: 19,
    freeTrialConsumedAt: new Date(),
    subscriptionStatus: "active",
  });

  await expect(assignFreeTrialOrThrow(tx as never, subscribed, 20, false)).resolves.toEqual(subscribed);
  expect(tx.teamSettlementAccess.update).not.toHaveBeenCalled();
  expect(buildSettlementAccessView({
    id: 20,
    currentRevisionNumber: null,
    team: {
      settlementAccess: subscribed,
      settlementSubscription: { stripeSubscriptionStatus: "active" },
    },
  })).toMatchObject({ state: "subscribed", canEdit: true, subscriptionStatus: "active" });
});
