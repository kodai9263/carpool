/** @jest-environment node */
import {
  buildSettlementDraft,
  calculateSnapshotWithMovements,
  createSettlementSnapshot,
  mergeSettlementDraft,
  parseSettlementDraft,
} from "../settlementServer";

const ride = {
  id: 9,
  date: new Date("2026-09-20T00:00:00.000Z"),
  destination: "県営球場",
  updatedAt: new Date("2026-09-13T01:00:00.000Z"),
  rideAssignments: [
    { driver: { direction: "outbound" }, child: { id: 11, memberId: 1 } },
  ],
  childAvailabilities: [
    { childId: 11, availability: true, selfDriving: false },
    { childId: 12, availability: false, selfDriving: false },
    { childId: 21, availability: true, selfDriving: true },
  ],
};

const members = [
  {
    id: 1,
    guardians: [{ name: "田中" }, { name: "花子" }],
    children: [{ id: 11, name: "太郎" }, { id: 12, name: "次郎" }],
  },
  {
    id: 2,
    guardians: [],
    children: [{ id: 21, name: "三郎" }],
  },
];

const source = { rideId: 9, date: "2026-09-20T00:00:00.000Z", destination: "県営球場" };

describe("buildSettlementDraft", () => {
  test("配車済みと自走を初期対象にし、欠席は対象外にする", () => {
    const draft = buildSettlementDraft(ride, members);

    expect(draft.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(draft.families).toEqual([
      {
        memberId: 1,
        memberName: "田中・花子 家族",
        isIncluded: true,
        children: [
          { childId: 11, childName: "太郎", isSelected: true, sourceStatus: "assigned" },
          { childId: 12, childName: "次郎", isSelected: false, sourceStatus: "absent" },
        ],
      },
      {
        memberId: 2,
        memberName: "三郎さんの家族",
        isIncluded: true,
        children: [
          { childId: 21, childName: "三郎", isSelected: true, sourceStatus: "selfDriving" },
        ],
      },
    ]);
  });

  test("配車元が変わると取込指紋も変わる", () => {
    const before = buildSettlementDraft(ride, members);
    const after = buildSettlementDraft({ ...ride, destination: "市営球場" }, members);

    expect(after.sourceFingerprint).not.toBe(before.sourceFingerprint);
  });

  test("欠席回答と配車割当が矛盾する子どもは自動で対象にしない", () => {
    const contradictoryRide = {
      ...ride,
      childAvailabilities: ride.childAvailabilities.map((item) => item.childId === 11 ? { ...item, availability: false } : item),
    };

    const draft = buildSettlementDraft(contradictoryRide, members);
    expect(draft.families[0].children[0]).toEqual(expect.objectContaining({ sourceStatus: "absent", isSelected: false }));
  });
});

describe("mergeSettlementDraft", () => {
  test("クライアントの選択と費用だけを反映し、家庭名や参加元は上書きさせない", () => {
    const base = buildSettlementDraft(ride, members);
    const input = structuredClone(base);
    input.families[0].memberName = "改ざん名";
    input.families[0].children[0].childName = "改ざん子ども";
    input.families[0].children[0].sourceStatus = "absent";
    input.families[0].children[1].isSelected = true;
    input.expenses = [{ id: "cost-1", category: "parking", description: "終日", amount: 800, payerMemberId: 1 }];

    const merged = mergeSettlementDraft(base, input);

    expect(merged.families[0].memberName).toBe("田中・花子 家族");
    expect(merged.families[0].children[0]).toEqual(
      expect.objectContaining({ childName: "太郎", sourceStatus: "assigned" }),
    );
    expect(merged.families[0].children[1].isSelected).toBe(true);
    expect(merged.expenses[0].amount).toBe(800);
  });

  test("異なる取込指紋と所属外の家庭を拒否する", () => {
    const base = buildSettlementDraft(ride, members);
    expect(() => mergeSettlementDraft(base, { ...base, sourceFingerprint: "0".repeat(64) })).toThrow(/更新/);
    expect(() => mergeSettlementDraft(base, {
      ...base,
      families: [...base.families, { ...base.families[0], memberId: 999 }],
    })).toThrow(/家庭一覧/);
  });
});

describe("精算確定の入力検証", () => {
  test("途中の0円は下書きとして読めるが確定できない", () => {
    const draft = buildSettlementDraft(ride, members);
    draft.expenses = [{ id: "cost-1", category: "toll", description: "", amount: 0, payerMemberId: null }];

    expect(parseSettlementDraft(draft).expenses[0].amount).toBe(0);
    expect(() => createSettlementSnapshot(draft, source)).toThrow(/金額/);
  });

  test("確定版に負担・立替・残額を保存する", () => {
    const draft = buildSettlementDraft(ride, members);
    draft.expenses = [
      { id: "cost-1", category: "toll", description: "往復", amount: 3_000, payerMemberId: 1 },
    ];

    const snapshot = createSettlementSnapshot(draft, source);

    expect(snapshot.calculation.totalCost).toBe(3_000);
    expect(snapshot.calculation.families).toEqual([
      expect.objectContaining({ memberId: 1, burdenAmount: 1_500, advanceAmount: 3_000, remainingAmount: -1_500 }),
      expect.objectContaining({ memberId: 2, burdenAmount: 1_500, advanceAmount: 0, remainingAmount: 1_500 }),
    ]);
  });

  test("取消中は元の負担と立替を0にし、実際の受領済み純額だけを戻す", () => {
    const draft = buildSettlementDraft(ride, members);
    draft.expenses = [{ id: "cost-1", category: "toll", description: "往復", amount: 3_000, payerMemberId: 1 }];
    const snapshot = createSettlementSnapshot(draft, source);

    const cancellation = calculateSnapshotWithMovements(snapshot, [
      { memberIdSnapshot: 1, signedAmount: -1_500 },
      { memberIdSnapshot: 2, signedAmount: 1_000 },
    ], true);

    expect(cancellation.totalCost).toBe(0);
    expect(cancellation.families).toEqual([
      expect.objectContaining({ memberId: 1, burdenAmount: 0, advanceAmount: 0, receivedNetAmount: -1_500, remainingAmount: 1_500 }),
      expect.objectContaining({ memberId: 2, burdenAmount: 0, advanceAmount: 0, receivedNetAmount: 1_000, remainingAmount: -1_000 }),
    ]);
    expect(cancellation.isComplete).toBe(false);
  });
});
