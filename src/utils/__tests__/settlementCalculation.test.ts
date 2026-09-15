import {
  allocateSettlementBurden,
  calculateSettlement,
  SettlementCalculationInput,
} from "../settlementCalculation";

const family = (
  memberId: number,
  childCount = 1,
  receivedNetAmount = 0,
  isIncluded = true
) => ({ memberId, childCount, receivedNetAmount, isIncluded });

function resultByMember(input: SettlementCalculationInput, memberId: number) {
  return calculateSettlement(input).families.find((item) => item.memberId === memberId);
}

describe("calculateSettlement", () => {
  test("家庭均等の負担、家庭の立替、残額を相殺する", () => {
    const result = calculateSettlement({
      allocationMethod: "equal",
      costs: [
        { amount: 6_000, payerMemberId: 30 },
        { amount: 3_000, payerMemberId: 20 },
      ],
      families: [family(30), family(10), family(20)],
    });

    expect(result).toEqual({
      totalCost: 9_000,
      totalWeight: 3,
      teamAdvanceAmount: 0,
      families: [
        { memberId: 10, weight: 1, burdenAmount: 3_000, advanceAmount: 0, receivedNetAmount: 0, remainingAmount: 3_000 },
        { memberId: 20, weight: 1, burdenAmount: 3_000, advanceAmount: 3_000, receivedNetAmount: 0, remainingAmount: 0 },
        { memberId: 30, weight: 1, burdenAmount: 3_000, advanceAmount: 6_000, receivedNetAmount: 0, remainingAmount: -3_000 },
      ],
      isComplete: false,
    });
  });

  test("最大剰余法の余りが同率なら入力順ではなくmemberId昇順で1円を配る", () => {
    const result = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 1_000, payerMemberId: null }],
      families: [family(30), family(10), family(20)],
    });

    expect(result.families.map(({ memberId, burdenAmount }) => ({ memberId, burdenAmount }))).toEqual([
      { memberId: 10, burdenAmount: 334 },
      { memberId: 20, burdenAmount: 333 },
      { memberId: 30, burdenAmount: 333 },
    ]);
  });

  test("子ども人数を重みにして端数を最大剰余法で配る", () => {
    const input: SettlementCalculationInput = {
      allocationMethod: "byChildCount",
      costs: [{ amount: 1_000, payerMemberId: null }],
      families: [family(10, 2), family(20, 1)],
    };

    expect(resultByMember(input, 10)?.burdenAmount).toBe(667);
    expect(resultByMember(input, 20)?.burdenAmount).toBe(333);
    expect(calculateSettlement(input).totalWeight).toBe(3);
  });

  test("家庭均等では子ども人数にかかわらず同じ重みにする", () => {
    const result = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 1_000, payerMemberId: null }],
      families: [family(10, 2), family(20, 1)],
    });

    expect(result.families.map((item) => item.burdenAmount)).toEqual([500, 500]);
  });

  test("負担対象外の家庭による立替を返金額として残す", () => {
    const input: SettlementCalculationInput = {
      allocationMethod: "equal",
      costs: [{ amount: 1_000, payerMemberId: 40 }],
      families: [family(10), family(20), family(40, 0, 0, false)],
    };
    const result = calculateSettlement(input);

    expect(resultByMember(input, 40)?.remainingAmount).toBe(-1_000);
    expect(result.families.map((item) => item.burdenAmount)).toEqual([500, 500, 0]);
  });

  test("チーム会計の立替は家庭の立替に含めない", () => {
    const result = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 3_000, payerMemberId: null }],
      families: [family(10), family(20), family(30)],
    });

    expect(result.teamAdvanceAmount).toBe(3_000);
    expect(result.families.map((item) => item.remainingAmount)).toEqual([1_000, 1_000, 1_000]);
  });

  test("一部受領を差し引き、全家庭の残額が0になるまで未完了とする", () => {
    const partial = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 3_000, payerMemberId: null }],
      families: [family(10, 1, 1_000)],
    });
    expect(partial.families[0].remainingAmount).toBe(2_000);
    expect(partial.isComplete).toBe(false);

    const complete = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 3_000, payerMemberId: null }],
      families: [family(10, 1, 3_000)],
    });
    expect(complete.families[0].remainingAmount).toBe(0);
    expect(complete.isComplete).toBe(true);
  });

  test("訂正後も過去の受領を残して返金額を計算する", () => {
    const result = calculateSettlement({
      allocationMethod: "equal",
      costs: [{ amount: 2_500, payerMemberId: null }],
      families: [family(10, 1, 3_000)],
    });

    expect(result.families[0].remainingAmount).toBe(-500);
  });

  test("負担と立替がなくなった家庭も受領履歴があれば残額を返す", () => {
    const input: SettlementCalculationInput = {
      allocationMethod: "equal",
      costs: [{ amount: 1_000, payerMemberId: null }],
      families: [family(10), family(20, 0, 500, false)],
    };
    const result = calculateSettlement(input);

    expect(resultByMember(input, 20)?.remainingAmount).toBe(-500);
    expect(result.families).toHaveLength(2);
  });

  test("様々な合計と重みでも負担額の合計が費用合計と一致する", () => {
    let seed = 20260913;
    const random = () => {
      seed = (seed * 48_271) % 2_147_483_647;
      return seed;
    };

    for (let index = 0; index < 200; index += 1) {
      const total = (random() % 1_000_000) + 1;
      const count = (random() % 20) + 1;
      const weightedMembers = Array.from({ length: count }, (_, offset) => ({
        memberId: offset + 1,
        weight: (random() % 5) + 1,
      }));
      const burdens = allocateSettlementBurden(total, weightedMembers);
      expect([...burdens.values()].reduce((sum, amount) => sum + amount, 0)).toBe(total);
    }
  });
});

describe("settlementCalculationの入力検証", () => {
  const valid: SettlementCalculationInput = {
    allocationMethod: "equal",
    costs: [{ amount: 1_000, payerMemberId: null }],
    families: [family(10)],
  };

  test.each([0, -1, 1.5, Number.NaN, 1_000_001])(
    "1明細の不正な金額 %p を拒否する",
    (amount) => {
      expect(() => calculateSettlement({ ...valid, costs: [{ amount, payerMemberId: null }] })).toThrow();
    }
  );

  test("費用明細なしを拒否する", () => {
    expect(() => calculateSettlement({ ...valid, costs: [] })).toThrow(/費用明細/);
  });

  test("費用合計10,000,000円を受け入れ、それを超える明細群を拒否する", () => {
    const tenItems = Array.from({ length: 10 }, () => ({ amount: 1_000_000, payerMemberId: null }));
    expect(calculateSettlement({ ...valid, costs: tenItems }).totalCost).toBe(10_000_000);
    expect(() => calculateSettlement({
      ...valid,
      costs: [...tenItems, { amount: 1, payerMemberId: null }],
    })).toThrow(/費用合計/);
  });

  test("重み合計0では計算しない", () => {
    expect(() => calculateSettlement({
      ...valid,
      allocationMethod: "byChildCount",
      families: [family(10, 0), family(20, 0)],
    })).toThrow(/重み合計/);
  });

  test.each([-1, 1.5, Number.NaN])("不正な子ども人数 %p を拒否する", (childCount) => {
    expect(() => calculateSettlement({ ...valid, families: [family(10, childCount)] })).toThrow();
  });

  test.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "整数でない受領済み純額 %p を拒否する",
    (receivedNetAmount) => {
      expect(() => calculateSettlement({ ...valid, families: [family(10, 1, receivedNetAmount)] })).toThrow();
    }
  );

  test("家庭IDの重複を拒否する", () => {
    expect(() => calculateSettlement({ ...valid, families: [family(10), family(10)] })).toThrow(/重複/);
  });

  test("家庭一覧にない家庭の立替を拒否する", () => {
    expect(() => calculateSettlement({
      ...valid,
      costs: [{ amount: 1_000, payerMemberId: 99 }],
    })).toThrow(/家庭一覧/);
  });

  test.each([0, -1, 1.5, Number.NaN])("不正な家庭ID %p を拒否する", (memberId) => {
    expect(() => calculateSettlement({ ...valid, families: [family(memberId)] })).toThrow(/家庭ID/);
  });
});
