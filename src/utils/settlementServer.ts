import { createHash, randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import type {
  SettlementDraft,
  SettlementDetail,
  SettlementStatus,
  SettlementDraftFamily,
  SettlementSnapshot,
} from "@/app/_types/settlement";
import {
  calculateSettlement,
  SettlementCalculationError,
  SETTLEMENT_COST_ITEM_MAX,
} from "@/utils/settlementCalculation";
import { buildSettlementAccessView } from "@/utils/settlementAccess";

export const SETTLEMENT_MAX_EXPENSES = 100;
export const SETTLEMENT_MAX_FAMILIES = 500;

const EXPENSE_CATEGORIES = new Set(["toll", "parking", "fuel", "other"]);
const CHILD_SOURCE_STATUSES = new Set(["assigned", "selfDriving", "absent", "unassigned"]);

export class SettlementInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new SettlementInputError(`${label}を確認してください`);
  }
  return value as number;
}

export function parseSettlementVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new SettlementInputError("版番号を確認してください");
  }
  return value as number;
}

export function parseOperationKey(value: unknown): string {
  if (typeof value !== "string" || value.length < 8 || value.length > 100) {
    throw new SettlementInputError("操作IDを確認してください");
  }
  return value;
}

export function parseSettlementDraft(value: unknown): SettlementDraft {
  if (!isRecord(value)) throw new SettlementInputError("精算内容を確認してください");
  if (value.allocationMethod !== "equal" && value.allocationMethod !== "byChildCount") {
    throw new SettlementInputError("分担方法を確認してください");
  }
  if (typeof value.sourceFingerprint !== "string" || value.sourceFingerprint.length !== 64) {
    throw new SettlementInputError("配車の取込情報を確認してください");
  }
  if (!Array.isArray(value.families) || value.families.length === 0 || value.families.length > SETTLEMENT_MAX_FAMILIES) {
    throw new SettlementInputError("家庭一覧を確認してください");
  }
  if (!Array.isArray(value.expenses) || value.expenses.length > SETTLEMENT_MAX_EXPENSES) {
    throw new SettlementInputError(`費用明細は${SETTLEMENT_MAX_EXPENSES}件以下にしてください`);
  }

  const memberIds = new Set<number>();
  const families = value.families.map((rawFamily): SettlementDraftFamily => {
    if (!isRecord(rawFamily) || typeof rawFamily.memberName !== "string" || typeof rawFamily.isIncluded !== "boolean") {
      throw new SettlementInputError("家庭一覧を確認してください");
    }
    const memberId = positiveInteger(rawFamily.memberId, "家庭ID");
    if (memberIds.has(memberId)) throw new SettlementInputError("家庭IDが重複しています");
    memberIds.add(memberId);
    if (!rawFamily.memberName.trim() || rawFamily.memberName.length > 200 || !Array.isArray(rawFamily.children)) {
      throw new SettlementInputError("家庭名と子どもの情報を確認してください");
    }
    const childIds = new Set<number>();
    const children = rawFamily.children.map((rawChild) => {
      if (!isRecord(rawChild) || typeof rawChild.childName !== "string" || typeof rawChild.isSelected !== "boolean" ||
          !CHILD_SOURCE_STATUSES.has(String(rawChild.sourceStatus))) {
        throw new SettlementInputError("子どもの情報を確認してください");
      }
      const childId = positiveInteger(rawChild.childId, "子どもID");
      if (childIds.has(childId)) throw new SettlementInputError("子どもIDが重複しています");
      childIds.add(childId);
      return {
        childId,
        childName: rawChild.childName.slice(0, 200),
        isSelected: rawChild.isSelected,
        sourceStatus: rawChild.sourceStatus as SettlementDraftFamily["children"][number]["sourceStatus"],
      };
    });
    return { memberId, memberName: rawFamily.memberName.trim(), isIncluded: rawFamily.isIncluded, children };
  });

  const expenseIds = new Set<string>();
  const expenses = value.expenses.map((rawExpense) => {
    if (!isRecord(rawExpense) || typeof rawExpense.id !== "string" || !EXPENSE_CATEGORIES.has(String(rawExpense.category))) {
      throw new SettlementInputError("費用明細を確認してください");
    }
    if (!rawExpense.id || rawExpense.id.length > 100 || expenseIds.has(rawExpense.id)) {
      throw new SettlementInputError("費用明細のIDを確認してください");
    }
    expenseIds.add(rawExpense.id);
    if (!Number.isSafeInteger(rawExpense.amount) || (rawExpense.amount as number) < 0 ||
        (rawExpense.amount as number) > SETTLEMENT_COST_ITEM_MAX) {
      throw new SettlementInputError(`費用は0〜${SETTLEMENT_COST_ITEM_MAX.toLocaleString("ja-JP")}円の整数で入力してください`);
    }
    const payerMemberId = rawExpense.payerMemberId === null
      ? null
      : positiveInteger(rawExpense.payerMemberId, "立替元の家庭ID");
    if (payerMemberId !== null && !memberIds.has(payerMemberId)) {
      throw new SettlementInputError("立替元の家庭を確認してください");
    }
    const description = typeof rawExpense.description === "string" ? rawExpense.description.trim() : "";
    if (description.length > 200) throw new SettlementInputError("費用の説明は200文字以内にしてください");
    return {
      id: rawExpense.id,
      category: rawExpense.category as SettlementDraft["expenses"][number]["category"],
      description,
      amount: rawExpense.amount as number,
      payerMemberId,
    };
  });

  return { allocationMethod: value.allocationMethod, families, expenses, sourceFingerprint: value.sourceFingerprint };
}

type SourceRide = {
  id: number;
  date: Date;
  destination: string;
  updatedAt: Date;
  rideAssignments: Array<{ driver: { direction: string }; child: { id: number; memberId: number } }>;
  childAvailabilities: Array<{ childId: number; availability: boolean; selfDriving: boolean }>;
};

type SourceMember = {
  id: number;
  guardians: Array<{ name: string }>;
  children: Array<{ id: number; name: string }>;
};

function memberName(member: SourceMember): string {
  const guardians = member.guardians.map(({ name }) => name.trim()).filter(Boolean);
  if (guardians.length) return `${guardians.join("・")} 家族`;
  return member.children[0]?.name ? `${member.children[0].name}さんの家族` : `家族${member.id}`;
}

export function buildSettlementDraft(ride: SourceRide, members: SourceMember[]): SettlementDraft {
  const assignedChildIds = new Set(ride.rideAssignments.map(({ child }) => child.id));
  const availabilityByChild = new Map(ride.childAvailabilities.map((item) => [item.childId, item]));
  const sourceFingerprint = createHash("sha256").update(JSON.stringify({
    rideId: ride.id,
    date: ride.date.toISOString(),
    destination: ride.destination,
    updatedAt: ride.updatedAt.toISOString(),
    assignments: ride.rideAssignments
      .map(({ child, driver }) => [child.id, child.memberId, driver.direction])
      .sort((a, b) => Number(a[0]) - Number(b[0])),
    availabilities: ride.childAvailabilities
      .map((item) => [item.childId, item.availability, item.selfDriving])
      .sort((a, b) => Number(a[0]) - Number(b[0])),
  })).digest("hex");

  return {
    allocationMethod: "equal",
    sourceFingerprint,
    expenses: [],
    families: members.map((member) => {
      const children = member.children.map((child) => {
        const availability = availabilityByChild.get(child.id);
        const sourceStatus = availability && !availability.availability
          ? "absent"
          : assignedChildIds.has(child.id)
            ? "assigned"
            : availability?.selfDriving
            ? "selfDriving"
              : "unassigned";
        return {
          childId: child.id,
          childName: child.name,
          isSelected: sourceStatus === "assigned" || sourceStatus === "selfDriving",
          sourceStatus,
        } as const;
      });
      return {
        memberId: member.id,
        memberName: memberName(member),
        isIncluded: children.some(({ isSelected }) => isSelected),
        children,
      };
    }).sort((a, b) => a.memberId - b.memberId),
  };
}

/** 名前や所属をクライアントから上書きさせず、選択・費用だけを反映する。 */
export function mergeSettlementDraft(base: SettlementDraft, input: unknown): SettlementDraft {
  const parsed = parseSettlementDraft(input);
  if (parsed.sourceFingerprint !== base.sourceFingerprint) {
    throw new SettlementInputError("配車の取込内容が更新されています。再読み込みしてください");
  }
  const inputFamilies = new Map(parsed.families.map((family) => [family.memberId, family]));
  if (inputFamilies.size !== base.families.length) throw new SettlementInputError("家庭一覧を確認してください");
  const families = base.families.map((family) => {
    const selected = inputFamilies.get(family.memberId);
    if (!selected) throw new SettlementInputError("家庭の所属を確認してください");
    const selectedChildren = new Map(selected.children.map((child) => [child.childId, child]));
    if (selectedChildren.size !== family.children.length) throw new SettlementInputError("子どもの所属を確認してください");
    return {
      ...family,
      isIncluded: selected.isIncluded,
      children: family.children.map((child) => {
        const selectedChild = selectedChildren.get(child.childId);
        if (!selectedChild) throw new SettlementInputError("子どもの所属を確認してください");
        return { ...child, isSelected: selectedChild.isSelected };
      }),
    };
  });
  return { ...base, allocationMethod: parsed.allocationMethod, families, expenses: parsed.expenses };
}

export function createSettlementSnapshot(
  draft: SettlementDraft,
  source: SettlementSnapshot["source"],
): SettlementSnapshot {
  if ((source.rideId !== null && (!Number.isSafeInteger(source.rideId) || source.rideId <= 0)) ||
      typeof source.date !== "string" || Number.isNaN(new Date(source.date).getTime()) ||
      typeof source.destination !== "string" || !source.destination.trim() || source.destination.length > 500) {
    throw new SettlementInputError("配車の確定情報を確認してください");
  }
  for (const expense of draft.expenses) {
    if (expense.amount < 1) throw new SettlementInputError("費用明細の金額を入力してください");
    if (expense.category === "other" && !expense.description) {
      throw new SettlementInputError("その他交通費の説明を入力してください");
    }
  }
  try {
    const calculation = calculateSettlement({
      allocationMethod: draft.allocationMethod,
      costs: draft.expenses.map(({ amount, payerMemberId }) => ({ amount, payerMemberId })),
      families: draft.families.map((family) => ({
        memberId: family.memberId,
        isIncluded: family.isIncluded,
        childCount: family.children.filter(({ isSelected }) => isSelected).length,
      })),
    });
    return { ...draft, source: { ...source, destination: source.destination.trim() }, calculation };
  } catch (error) {
    if (error instanceof SettlementCalculationError) throw new SettlementInputError(error.message);
    throw error;
  }
}

export function parseStoredDraft(value: Prisma.JsonValue | null): SettlementDraft | null {
  if (value === null) return null;
  try {
    return parseSettlementDraft(value);
  } catch {
    return null;
  }
}

export function parseStoredSnapshot(value: Prisma.JsonValue): SettlementSnapshot {
  const snapshot = value as unknown as SettlementSnapshot;
  if (!isRecord(snapshot) || !isRecord(snapshot.calculation) || !isRecord(snapshot.source)) {
    throw new SettlementInputError("確定版の形式が正しくありません");
  }
  const rideId = snapshot.source.rideId;
  if ((rideId !== null && (!Number.isSafeInteger(rideId) || rideId <= 0)) ||
      typeof snapshot.source.date !== "string" || Number.isNaN(new Date(snapshot.source.date).getTime()) ||
      typeof snapshot.source.destination !== "string" || !snapshot.source.destination) {
    throw new SettlementInputError("確定版の配車情報が正しくありません");
  }
  return {
    ...parseSettlementDraft(snapshot),
    source: { rideId, date: snapshot.source.date, destination: snapshot.source.destination },
    calculation: snapshot.calculation,
  };
}

export function newExpenseId(): string {
  return randomUUID();
}

export const settlementDetailInclude = {
  ride: { select: { updatedAt: true } },
  team: {
    select: {
      settlementAccess: {
        select: {
          freeTrialSettlementId: true,
          freeTrialConsumedAt: true,
        },
      },
      settlementSubscription: {
        select: { stripeSubscriptionStatus: true },
      },
    },
  },
  revisions: { orderBy: { revision: "desc" as const } },
  movements: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.RideSettlementInclude;

type SettlementWithDetails = Prisma.RideSettlementGetPayload<{
  include: typeof settlementDetailInclude;
}>;

function normalizeStatus(status: string): SettlementStatus {
  return ["draft", "pending", "completed", "voiding", "voided"].includes(status)
    ? status as SettlementStatus
    : "draft";
}

export function calculateSnapshotWithMovements(
  snapshot: SettlementSnapshot,
  movements: ReadonlyArray<{ memberIdSnapshot: number; signedAmount: number }>,
  isVoiding = false,
) {
  const receivedByMember = new Map<number, number>();
  for (const movement of movements) {
    receivedByMember.set(
      movement.memberIdSnapshot,
      (receivedByMember.get(movement.memberIdSnapshot) ?? 0) + movement.signedAmount,
    );
  }
  if (isVoiding) {
    const families = snapshot.families
      .map((family) => {
        const receivedNetAmount = receivedByMember.get(family.memberId) ?? 0;
        return {
          memberId: family.memberId,
          weight: 0,
          burdenAmount: 0,
          advanceAmount: 0,
          receivedNetAmount,
          remainingAmount: -receivedNetAmount,
        };
      })
      .sort((a, b) => a.memberId - b.memberId);
    return {
      totalCost: 0,
      totalWeight: 0,
      teamAdvanceAmount: 0,
      families,
      isComplete: families.every((family) => family.remainingAmount === 0),
    };
  }
  return calculateSettlement({
    allocationMethod: snapshot.allocationMethod,
    costs: snapshot.expenses.map(({ amount, payerMemberId }) => ({ amount, payerMemberId })),
    families: snapshot.families.map((family) => ({
      memberId: family.memberId,
      isIncluded: family.isIncluded,
      childCount: family.children.filter(({ isSelected }) => isSelected).length,
      receivedNetAmount: receivedByMember.get(family.memberId) ?? 0,
    })),
  });
}

export function buildSettlementDetail(settlement: SettlementWithDetails): SettlementDetail {
  const revisions = settlement.revisions.map((revision) => ({
    revision: revision.revision,
    snapshot: parseStoredSnapshot(revision.snapshot),
    totalAmount: revision.totalAmount,
    correctionReason: revision.correctionReason,
    createdAt: revision.createdAt.toISOString(),
  }));
  const currentRevision = revisions.find(({ revision }) => revision === settlement.currentRevisionNumber) ?? null;
  let calculation = currentRevision?.snapshot.calculation ?? null;
  if (currentRevision) {
    calculation = calculateSnapshotWithMovements(
      currentRevision.snapshot,
      settlement.movements,
      settlement.status === "voiding" || settlement.status === "voided",
    );
  }
  return {
    id: settlement.id,
    teamId: settlement.teamId,
    rideId: settlement.rideId,
    sourceDate: settlement.sourceDate.toISOString(),
    sourceDestination: settlement.sourceDestination,
    status: normalizeStatus(settlement.status),
    version: settlement.version,
    currentRevisionNumber: settlement.currentRevisionNumber,
    voidReason: settlement.voidReason,
    sourceChanged: Boolean(
      settlement.ride && settlement.sourceRideUpdatedAt &&
      settlement.ride.updatedAt.getTime() !== settlement.sourceRideUpdatedAt.getTime()
    ),
    draft: parseStoredDraft(settlement.draft),
    currentRevision,
    revisions,
    movements: settlement.movements.map((movement) => ({
      id: movement.id,
      memberIdSnapshot: movement.memberIdSnapshot,
      memberNameSnapshot: movement.memberNameSnapshot,
      signedAmount: movement.signedAmount,
      note: movement.note,
      reversesMovementId: movement.reversesMovementId,
      createdAt: movement.createdAt.toISOString(),
    })),
    calculation,
    access: buildSettlementAccessView(settlement),
  };
}
