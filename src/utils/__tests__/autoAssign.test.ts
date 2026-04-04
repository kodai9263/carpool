import {
  autoAssign,
  isAutoAssignError,
  DriverCandidate,
  ChildCandidate,
} from "../autoAssign";

// テスト用ヘルパー
function makeDriver(
  id: number,
  seats: number,
  pastDriveCount: number,
  guardianMemberId: number,
  direction: "outbound" | "inbound" | "both" = "both"
): DriverCandidate {
  return { availabilityDriverId: id, seats, pastDriveCount, guardianMemberId, direction };
}

function makeChild(id: number, memberId: number, grade: number | null = null): ChildCandidate {
  return { id, memberId, grade };
}

describe("autoAssign - separateDirections=false（行き帰り一括）", () => {
  test("候補ドライバーがゼロの場合 NO_DRIVERS を返す", () => {
    const result = autoAssign({
      drivers: [],
      children: [makeChild(1, 10)],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(true);
    if (isAutoAssignError(result)) expect(result.error).toBe("NO_DRIVERS");
  });

  test("参加可能な子どもがゼロの場合 NO_CHILDREN を返す", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 4, 0, 99)],
      children: [],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(true);
    if (isAutoAssignError(result)) expect(result.error).toBe("NO_CHILDREN");
  });

  test("座席数が子ども数より少ない場合 INSUFFICIENT_SEATS を返す", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 2, 0, 99)],
      children: [makeChild(1, 10), makeChild(2, 11), makeChild(3, 12)],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(true);
    if (isAutoAssignError(result)) expect(result.error).toBe("INSUFFICIENT_SEATS");
  });

  test("台数指定で座席が足りない場合 INSUFFICIENT_SEATS を返す", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 2, 0, 99), makeDriver(2, 4, 1, 98), makeDriver(3, 4, 2, 97)],
      children: [makeChild(1, 10), makeChild(2, 11), makeChild(3, 12)],
      numberOfCars: 1, // 1台(2席)では3人乗れない
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(true);
    if (isAutoAssignError(result)) expect(result.error).toBe("INSUFFICIENT_SEATS");
  });

  test("運転回数が少ない順にドライバーが選ばれる", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 3, 91), // 3回（選ばれない）
        makeDriver(2, 4, 1, 92), // 1回（選ばれる）
        makeDriver(3, 4, 0, 93), // 0回（選ばれる）
      ],
      children: [makeChild(1, 10), makeChild(2, 11)],
      numberOfCars: 2,
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const ids = result.map((d) => d.availabilityDriverId);
      expect(ids).toContain(3); // 0回
      expect(ids).toContain(2); // 1回
      expect(ids).not.toContain(1); // 3回は除外
    }
  });

  test("台数未指定で最小台数が自動計算される", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 2, 0, 91), // 0回
        makeDriver(2, 2, 1, 92), // 1回
        makeDriver(3, 2, 2, 93), // 2回
      ],
      children: [makeChild(1, 10), makeChild(2, 11), makeChild(3, 12)],
      // 子ども3人: 1台(2席)では足りない → 2台選ぶ
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      expect(result).toHaveLength(2);
      expect(result[0].availabilityDriverId).toBe(1); // 0回が先
      expect(result[1].availabilityDriverId).toBe(2); // 1回が次
    }
  });

  test("全ての子どもが割り当てられる（mix）", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 3, 0, 91), makeDriver(2, 3, 1, 92)],
      children: [makeChild(1, 10), makeChild(2, 11), makeChild(3, 12)],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const allAssigned = result.flatMap((d) => d.rideAssignments.map((r) => r.childId));
      expect(allAssigned.sort()).toEqual([1, 2, 3]);
    }
  });

  test("direction='both' のドライバーのみ対象（separateDirections=false）", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 91, "outbound"), // both 以外 → 対象外
        makeDriver(2, 4, 1, 92, "inbound"),  // both 以外 → 対象外
        makeDriver(3, 4, 2, 93, "both"),     // both → 対象
      ],
      children: [makeChild(1, 10)],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      expect(result).toHaveLength(1);
      expect(result[0].availabilityDriverId).toBe(3);
    }
  });
});

describe("autoAssign - 親子ルール", () => {
  test("separateParentChild=true: 子どもは自分の親（同じmemberId）が運転する車に乗らない", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 10), // memberId=10 の保護者が運転
        makeDriver(2, 4, 1, 20), // memberId=20 の保護者が運転
      ],
      children: [makeChild(1, 10)], // memberId=10 の子ども → ドライバー1には乗れない
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: true,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const driver1 = result.find((d) => d.availabilityDriverId === 1);
      const driver2 = result.find((d) => d.availabilityDriverId === 2);
      expect(driver1?.rideAssignments.map((r) => r.childId)).not.toContain(1);
      expect(driver2?.rideAssignments.map((r) => r.childId)).toContain(1);
    }
  });

  test("separateParentChild=true: 全ドライバーが親の場合でも他の子どもは正常に割り当てられる", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 10),
        makeDriver(2, 4, 1, 20),
      ],
      children: [
        makeChild(1, 10), // ドライバー1の子 → ドライバー2へ
        makeChild(2, 20), // ドライバー2の子 → ドライバー1へ
      ],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: true,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const driver1 = result.find((d) => d.availabilityDriverId === 1);
      const driver2 = result.find((d) => d.availabilityDriverId === 2);
      expect(driver1?.rideAssignments.map((r) => r.childId)).toContain(2);
      expect(driver2?.rideAssignments.map((r) => r.childId)).toContain(1);
    }
  });

  test("separateParentChild=false: 子どもが自分の親の車に乗れる", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 10), // memberId=10 の保護者が運転
      ],
      children: [makeChild(1, 10)], // memberId=10 の子ども → 親子同乗OK
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const driver1 = result.find((d) => d.availabilityDriverId === 1);
      expect(driver1?.rideAssignments.map((r) => r.childId)).toContain(1);
    }
  });
});

describe("autoAssign - 学年配分", () => {
  test("gradeGrouping='mix' で子どもが複数台に均等分配される", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 3, 0, 91), makeDriver(2, 3, 1, 92)],
      children: [
        makeChild(1, 10, 6),
        makeChild(2, 11, 6),
        makeChild(3, 12, 5),
        makeChild(4, 13, 5),
      ],
      gradeGrouping: "mix",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      // 4人を2台に分けるので各2人
      expect(result[0].rideAssignments).toHaveLength(2);
      expect(result[1].rideAssignments).toHaveLength(2);
    }
  });

  test("gradeGrouping='group' で同学年の子どもがまとめられる", () => {
    // 2席×2台。grade=6が2人、grade=5が2人 → 各台に同学年がまとまるはず
    const result = autoAssign({
      drivers: [makeDriver(1, 2, 0, 91), makeDriver(2, 2, 1, 92)],
      children: [
        makeChild(1, 10, 6),
        makeChild(2, 11, 6),
        makeChild(3, 12, 5),
        makeChild(4, 13, 5),
      ],
      gradeGrouping: "group",
      separateDirections: false,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const allAssigned = result.flatMap((d) => d.rideAssignments.map((r) => r.childId));
      expect(allAssigned.sort()).toEqual([1, 2, 3, 4]);
      // 同学年(grade=6)の子ども1,2 が同じドライバーにまとめられているか確認
      const driver1Children = result[0].rideAssignments.map((r) => r.childId);
      const driver2Children = result[1]?.rideAssignments.map((r) => r.childId) ?? [];
      const sameGradeInDriver1 = [1, 2].every((id) => driver1Children.includes(id));
      const sameGradeInDriver2 = [1, 2].every((id) => driver2Children.includes(id));
      expect(sameGradeInDriver1 || sameGradeInDriver2).toBe(true);
    }
  });
});

describe("autoAssign - separateDirections=true（行き帰り別）", () => {
  test("行き・帰りで独立した AssignedDriver が返される", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 91, "both"),
        makeDriver(2, 4, 1, 92, "both"),
      ],
      children: [makeChild(1, 10), makeChild(2, 11)],
      gradeGrouping: "mix",
      separateDirections: true,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const outbound = result.filter((d) => d.direction === "outbound");
      const inbound = result.filter((d) => d.direction === "inbound");
      expect(outbound.length).toBeGreaterThan(0);
      expect(inbound.length).toBeGreaterThan(0);
    }
  });

  test("direction='outbound' のドライバーは行きのみ対象", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 91, "outbound"),
        makeDriver(2, 4, 1, 92, "inbound"),
      ],
      children: [makeChild(1, 10)],
      gradeGrouping: "mix",
      separateDirections: true,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const outbound = result.filter((d) => d.direction === "outbound");
      const inbound = result.filter((d) => d.direction === "inbound");
      expect(outbound[0].availabilityDriverId).toBe(1);
      expect(inbound[0].availabilityDriverId).toBe(2);
    }
  });

  test("全員が配分される（行き・帰りそれぞれで）", () => {
    const result = autoAssign({
      drivers: [
        makeDriver(1, 4, 0, 91, "both"),
        makeDriver(2, 4, 1, 92, "both"),
      ],
      children: [makeChild(1, 10), makeChild(2, 11), makeChild(3, 12)],
      gradeGrouping: "mix",
      separateDirections: true,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(false);
    if (!isAutoAssignError(result)) {
      const outboundChildren = result
        .filter((d) => d.direction === "outbound")
        .flatMap((d) => d.rideAssignments.map((r) => r.childId));
      const inboundChildren = result
        .filter((d) => d.direction === "inbound")
        .flatMap((d) => d.rideAssignments.map((r) => r.childId));
      expect(outboundChildren.sort()).toEqual([1, 2, 3]);
      expect(inboundChildren.sort()).toEqual([1, 2, 3]);
    }
  });

  test("行き・帰りのどちらかにドライバーがいない場合 NO_DRIVERS を返す", () => {
    const result = autoAssign({
      drivers: [makeDriver(1, 4, 0, 91, "outbound")], // 帰りのドライバーがいない
      children: [makeChild(1, 10)],
      gradeGrouping: "mix",
      separateDirections: true,
      separateParentChild: false,
    });
    expect(isAutoAssignError(result)).toBe(true);
    if (isAutoAssignError(result)) expect(result.error).toBe("NO_DRIVERS");
  });
});
