export const SETTLEMENT_COST_ITEM_MAX = 1_000_000;
export const SETTLEMENT_COST_TOTAL_MAX = 10_000_000;

export type SettlementAllocationMethod = "equal" | "byChildCount";

export type SettlementCostInput = {
  amount: number;
  /** null はチーム会計による立替を表す */
  payerMemberId: number | null;
};

export type SettlementFamilyInput = {
  memberId: number;
  /** 現在の版で負担対象に含めるか */
  isIncluded: boolean;
  /** 子ども人数方式の重み。家庭均等方式でも入力値の妥当性は検証する */
  childCount: number;
  /** チーム会計が受領済みの純額。返金済みは負数で表す */
  receivedNetAmount?: number;
};

export type SettlementCalculationInput = {
  allocationMethod: SettlementAllocationMethod;
  costs: SettlementCostInput[];
  families: SettlementFamilyInput[];
};

export type SettlementFamilyResult = {
  memberId: number;
  weight: number;
  burdenAmount: number;
  advanceAmount: number;
  receivedNetAmount: number;
  /** 正数はチーム会計が受領する額、負数は家庭へ返金する額 */
  remainingAmount: number;
};

export type SettlementCalculationResult = {
  totalCost: number;
  totalWeight: number;
  teamAdvanceAmount: number;
  families: SettlementFamilyResult[];
  isComplete: boolean;
};

export class SettlementCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementCalculationError";
  }
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new SettlementCalculationError(`${label}は整数で指定してください`);
  }
}

function assertMemberId(memberId: number, label: string): void {
  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    throw new SettlementCalculationError(`${label}を確認してください`);
  }
}

/**
 * 最大剰余法で費用合計を家庭へ配分する。
 * 余りが同じ場合は memberId が小さい家庭を優先する。
 */
export function allocateSettlementBurden(
  totalCost: number,
  weightedMembers: ReadonlyArray<{ memberId: number; weight: number }>
): Map<number, number> {
  assertSafeInteger(totalCost, "費用合計");
  if (totalCost < 1 || totalCost > SETTLEMENT_COST_TOTAL_MAX) {
    throw new SettlementCalculationError(
      `費用合計は1〜${SETTLEMENT_COST_TOTAL_MAX.toLocaleString("ja-JP")}円で指定してください`
    );
  }
  if (weightedMembers.length === 0) {
    throw new SettlementCalculationError("負担対象の家庭を選択してください");
  }

  const seen = new Set<number>();
  let totalWeight = BigInt(0);
  const members = weightedMembers.map(({ memberId, weight }) => {
    assertMemberId(memberId, "家庭ID");
    if (seen.has(memberId)) {
      throw new SettlementCalculationError("家庭IDが重複しています");
    }
    seen.add(memberId);
    assertSafeInteger(weight, "重み");
    if (weight < 0) {
      throw new SettlementCalculationError("重みは0以上で指定してください");
    }
    totalWeight += BigInt(weight);
    return { memberId, weight: BigInt(weight) };
  });

  if (totalWeight === BigInt(0)) {
    throw new SettlementCalculationError("負担対象の重み合計は1以上にしてください");
  }

  const total = BigInt(totalCost);
  const shares = members.map(({ memberId, weight }) => {
    const numerator = total * weight;
    return {
      memberId,
      amount: numerator / totalWeight,
      remainder: numerator % totalWeight,
    };
  });
  const allocated = shares.reduce((sum, share) => sum + share.amount, BigInt(0));
  const extraCount = Number(total - allocated);

  shares
    .sort((a, b) => {
      if (a.remainder !== b.remainder) {
        return a.remainder > b.remainder ? -1 : 1;
      }
      return a.memberId - b.memberId;
    })
    .slice(0, extraCount)
    .forEach((share) => {
      share.amount += BigInt(1);
    });

  return new Map(
    shares
      .sort((a, b) => a.memberId - b.memberId)
      .map((share) => [share.memberId, Number(share.amount)])
  );
}

/** 費用、負担、立替、受領済み純額から家庭ごとの残額を計算する。 */
export function calculateSettlement(
  input: SettlementCalculationInput
): SettlementCalculationResult {
  if (input.allocationMethod !== "equal" && input.allocationMethod !== "byChildCount") {
    throw new SettlementCalculationError("分担方法を確認してください");
  }
  if (!Array.isArray(input.costs) || input.costs.length === 0) {
    throw new SettlementCalculationError("費用明細を1件以上入力してください");
  }
  if (!Array.isArray(input.families) || input.families.length === 0) {
    throw new SettlementCalculationError("家庭を1件以上指定してください");
  }

  const familyById = new Map<number, SettlementFamilyInput>();
  for (const family of input.families) {
    assertMemberId(family.memberId, "家庭ID");
    if (familyById.has(family.memberId)) {
      throw new SettlementCalculationError("家庭IDが重複しています");
    }
    if (typeof family.isIncluded !== "boolean") {
      throw new SettlementCalculationError("負担対象の指定を確認してください");
    }
    assertSafeInteger(family.childCount, "子ども人数");
    if (family.childCount < 0) {
      throw new SettlementCalculationError("子ども人数は0以上で指定してください");
    }
    const received = family.receivedNetAmount ?? 0;
    assertSafeInteger(received, "受領済み純額");
    familyById.set(family.memberId, family);
  }

  const advances = new Map<number, number>();
  let totalCost = 0;
  let teamAdvanceAmount = 0;
  for (const cost of input.costs) {
    assertSafeInteger(cost.amount, "費用明細の金額");
    if (cost.amount < 1 || cost.amount > SETTLEMENT_COST_ITEM_MAX) {
      throw new SettlementCalculationError(
        `費用明細の金額は1〜${SETTLEMENT_COST_ITEM_MAX.toLocaleString("ja-JP")}円で指定してください`
      );
    }
    totalCost += cost.amount;
    if (totalCost > SETTLEMENT_COST_TOTAL_MAX) {
      throw new SettlementCalculationError(
        `費用合計は${SETTLEMENT_COST_TOTAL_MAX.toLocaleString("ja-JP")}円以下にしてください`
      );
    }

    if (cost.payerMemberId === null) {
      teamAdvanceAmount += cost.amount;
      continue;
    }
    assertMemberId(cost.payerMemberId, "立替元の家庭ID");
    if (!familyById.has(cost.payerMemberId)) {
      throw new SettlementCalculationError("立替元の家庭が家庭一覧にありません");
    }
    advances.set(
      cost.payerMemberId,
      (advances.get(cost.payerMemberId) ?? 0) + cost.amount
    );
  }

  const weightedMembers = input.families
    .filter((family) => family.isIncluded)
    .map((family) => ({
      memberId: family.memberId,
      weight: input.allocationMethod === "equal" ? 1 : family.childCount,
    }));
  const burdens = allocateSettlementBurden(totalCost, weightedMembers);
  const totalWeight = weightedMembers.reduce((sum, family) => {
    const next = sum + family.weight;
    assertSafeInteger(next, "重み合計");
    return next;
  }, 0);

  const families = input.families
    .map((family): SettlementFamilyResult => {
      const burdenAmount = burdens.get(family.memberId) ?? 0;
      const advanceAmount = advances.get(family.memberId) ?? 0;
      const receivedNetAmount = family.receivedNetAmount ?? 0;
      const remainingAmount = burdenAmount - advanceAmount - receivedNetAmount;
      assertSafeInteger(remainingAmount, "残額");
      return {
        memberId: family.memberId,
        weight: family.isIncluded
          ? input.allocationMethod === "equal"
            ? 1
            : family.childCount
          : 0,
        burdenAmount,
        advanceAmount,
        receivedNetAmount,
        remainingAmount,
      };
    })
    .sort((a, b) => a.memberId - b.memberId);

  return {
    totalCost,
    totalWeight,
    teamAdvanceAmount,
    families,
    isComplete: families.every((family) => family.remainingAmount === 0),
  };
}
