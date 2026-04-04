// 配車自動割り当てアルゴリズム

export interface DriverCandidate {
  availabilityDriverId: number;
  seats: number;
  direction: "outbound" | "inbound" | "both";
  guardianMemberId: number; // 親子チェック用
  pastDriveCount: number;   // 過去の運転回数（少ない順に選出）
}

export interface ChildCandidate {
  id: number;
  grade: number | null;     // currentGrade
  memberId: number;         // 親子チェック用
}

export interface AutoAssignInput {
  drivers: DriverCandidate[];
  children: ChildCandidate[];
  numberOfCars?: number;
  gradeGrouping: "mix" | "group";
  separateDirections: boolean;
  separateParentChild: boolean; // 親子を別々の車にするか（チームによって異なる）
}

export interface AssignedDriver {
  availabilityDriverId: number;
  direction: "outbound" | "inbound";
  seats: number;
  rideAssignments: { childId: number }[];
}

export type AutoAssignError = {
  error: "INSUFFICIENT_SEATS" | "NO_DRIVERS" | "NO_CHILDREN";
  minimumCars?: number; // 台数指定で足りない場合の最小必要台数
};

export type AutoAssignResult = AssignedDriver[] | AutoAssignError;

export function isAutoAssignError(result: AutoAssignResult): result is AutoAssignError {
  return !Array.isArray(result) && "error" in result;
}

/** 指定方向に対応しているドライバー候補をフィルタリング */
function filterByDirection(
  candidates: DriverCandidate[],
  direction: "outbound" | "inbound" | "both"
): DriverCandidate[] {
  if (direction === "both") {
    return candidates.filter((d) => d.direction === "both");
  }
  return candidates.filter(
    (d) => d.direction === direction || d.direction === "both"
  );
}

/** 運転回数昇順でソート（同数は availabilityDriverId 昇順で安定ソート） */
function sortByDriveCount(candidates: DriverCandidate[]): DriverCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.pastDriveCount !== b.pastDriveCount) {
      return a.pastDriveCount - b.pastDriveCount;
    }
    return a.availabilityDriverId - b.availabilityDriverId;
  });
}

/**
 * 台数未指定の場合に、全員乗れる最小台数のドライバーを選出する。
 * 座席数だけでなく親子ルールも考慮して実際に割り当て試行を繰り返す。
 * 全員乗れる組み合わせが見つからない場合は null を返す。
 */
function selectMinimumDrivers(
  candidates: DriverCandidate[],
  children: ChildCandidate[],
  gradeGrouping: "mix" | "group",
  separateParentChild: boolean
): DriverCandidate[] | null {
  const sorted = sortByDriveCount(candidates);

  for (let n = 1; n <= sorted.length; n++) {
    const selected = sorted.slice(0, n);
    const totalSeats = selected.reduce((sum, d) => sum + d.seats, 0);
    if (totalSeats < children.length) continue; // 座席数が足りない

    // 実際に割り当てて全員乗れるか確認（親子ルール含む）
    const assignmentMap =
      gradeGrouping === "group"
        ? assignGroup(selected, children, separateParentChild)
        : assignMix(selected, children, separateParentChild);
    const assignedCount = [...assignmentMap.values()].reduce(
      (sum, ids) => sum + ids.length,
      0
    );
    if (assignedCount === children.length) return selected;
  }

  return null; // 全ドライバー使っても全員乗れない
}

/**
 * 台数指定ありの場合に、指定台数のドライバーを選出する。
 * 座席数不足の場合は null を返す。
 */
function selectSpecifiedDrivers(
  candidates: DriverCandidate[],
  childCount: number,
  numberOfCars: number
): DriverCandidate[] | null {
  const sorted = sortByDriveCount(candidates);
  const selected = sorted.slice(0, numberOfCars);
  const totalSeats = selected.reduce((sum, d) => sum + d.seats, 0);
  if (totalSeats < childCount) return null;
  return selected;
}

/**
 * 子どもをドライバーに配分する（均等混合モード）。
 * 学年降順にソートしてラウンドロビンで配分。
 * separateParentChild=true の場合のみ親子ルール（自分の親の車に乗れない）を適用。
 */
function assignMix(
  selectedDrivers: DriverCandidate[],
  children: ChildCandidate[],
  separateParentChild: boolean
): Map<number, number[]> {
  // 学年降順ソート（null は最後）
  const sortedChildren = [...children].sort((a, b) => {
    if (a.grade === null && b.grade === null) return 0;
    if (a.grade === null) return 1;
    if (b.grade === null) return -1;
    return b.grade - a.grade;
  });

  // availabilityDriverId → childId[] のMap
  const result = new Map<number, number[]>();
  for (const d of selectedDrivers) {
    result.set(d.availabilityDriverId, []);
  }

  for (const child of sortedChildren) {
    // 親子NGでなく、まだ座席に空きがあるドライバーを探す（ラウンドロビン）
    // ドライバーリストを現在の乗車人数が少ない順に並べ替えて最初に乗れる車に配置
    const eligible = selectedDrivers
      .filter((d) => {
        // 親子ルール（separateParentChild=true の場合のみ適用）
        if (separateParentChild && d.guardianMemberId === child.memberId) return false;
        // 座席数チェック
        const assigned = result.get(d.availabilityDriverId) ?? [];
        return assigned.length < d.seats;
      })
      .sort((a, b) => {
        // 乗車人数が少ない順に優先
        const countA = result.get(a.availabilityDriverId)?.length ?? 0;
        const countB = result.get(b.availabilityDriverId)?.length ?? 0;
        return countA - countB;
      });

    if (eligible.length === 0) {
      // 割り当て先なし（座席数計算は事前チェック済みなので通常発生しない）
      continue;
    }

    const target = eligible[0];
    result.get(target.availabilityDriverId)!.push(child.id);
  }

  return result;
}

/**
 * 子どもをドライバーに配分する（同学年まとめモード）。
 * 学年グループを作り、まとめて1台に詰める。
 * separateParentChild=true の場合、親子ルールに引っかかる場合は別の台にまわす。
 */
function assignGroup(
  selectedDrivers: DriverCandidate[],
  children: ChildCandidate[],
  separateParentChild: boolean
): Map<number, number[]> {
  // 学年でグループ化（null は最後のグループ）
  const gradeGroups = new Map<number | null, ChildCandidate[]>();
  for (const child of children) {
    const key = child.grade;
    if (!gradeGroups.has(key)) gradeGroups.set(key, []);
    gradeGroups.get(key)!.push(child);
  }

  // 学年降順で処理（nullは最後）
  const sortedGrades = [...gradeGroups.keys()].sort((a, b) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });

  const result = new Map<number, number[]>();
  for (const d of selectedDrivers) {
    result.set(d.availabilityDriverId, []);
  }

  for (const grade of sortedGrades) {
    const gradeChildren = gradeGroups.get(grade) ?? [];

    for (const child of gradeChildren) {
      // まず同学年の子どもが既に乗っているドライバーを優先
      const driverWithSameGrade = selectedDrivers.find((d) => {
        // 親子ルール（separateParentChild=true の場合のみ適用）
        if (separateParentChild && d.guardianMemberId === child.memberId) return false;
        const assigned = result.get(d.availabilityDriverId) ?? [];
        if (assigned.length >= d.seats) return false;
        // 同学年の子どもが既に乗っているか
        return assigned.some(
          (cId) => children.find((c) => c.id === cId)?.grade === grade
        );
      });

      const target = driverWithSameGrade ?? selectedDrivers
        .filter((d) => {
          // 親子ルール（separateParentChild=true の場合のみ適用）
          if (separateParentChild && d.guardianMemberId === child.memberId) return false;
          const assigned = result.get(d.availabilityDriverId) ?? [];
          return assigned.length < d.seats;
        })
        .sort((a, b) => {
          const countA = result.get(a.availabilityDriverId)?.length ?? 0;
          const countB = result.get(b.availabilityDriverId)?.length ?? 0;
          return countA - countB;
        })[0];

      if (!target) continue;
      result.get(target.availabilityDriverId)!.push(child.id);
    }
  }

  return result;
}

/** 1方向分の割り当てを実行して AssignedDriver[] を返す */
function assignForDirection(
  candidates: DriverCandidate[],
  children: ChildCandidate[],
  direction: "outbound" | "inbound",
  gradeGrouping: "mix" | "group",
  separateParentChild: boolean,
  numberOfCars?: number
): AssignedDriver[] | AutoAssignError {
  if (candidates.length === 0) return { error: "NO_DRIVERS" };
  if (children.length === 0) return { error: "NO_CHILDREN" };

  let selected: DriverCandidate[] | null;
  if (numberOfCars !== undefined) {
    // 台数指定あり: 指定台数を選んで座席が足りるか確認
    selected = selectSpecifiedDrivers(candidates, children.length, numberOfCars);
  } else {
    // 台数未指定: 親子ルールも考慮して全員乗れる最小台数を探す
    selected = selectMinimumDrivers(candidates, children, gradeGrouping, separateParentChild);
  }
  if (!selected) {
    if (numberOfCars !== undefined) {
      // 台数指定で足りない場合、最小台数を計算して付加する
      const minimum = selectMinimumDrivers(candidates, children, gradeGrouping, separateParentChild);
      return { error: "INSUFFICIENT_SEATS", minimumCars: minimum?.length };
    }
    return { error: "INSUFFICIENT_SEATS" };
  }

  const assignmentMap =
    gradeGrouping === "group"
      ? assignGroup(selected, children, separateParentChild)
      : assignMix(selected, children, separateParentChild);

  return selected.map((d) => ({
    availabilityDriverId: d.availabilityDriverId,
    direction,
    seats: d.seats,
    rideAssignments: (assignmentMap.get(d.availabilityDriverId) ?? []).map(
      (childId) => ({ childId })
    ),
  }));
}

/**
 * 配車自動割り当てのメイン関数。
 * 純粋関数として実装（副作用なし）。
 */
export function autoAssign(input: AutoAssignInput): AutoAssignResult {
  const { drivers, children, numberOfCars, gradeGrouping, separateDirections, separateParentChild } =
    input;

  if (!separateDirections) {
    // 行き帰り一括モード: direction="both" の候補のみ対象
    const candidates = filterByDirection(drivers, "both");
    const result = assignForDirection(
      candidates,
      children,
      "outbound",
      gradeGrouping,
      separateParentChild,
      numberOfCars
    );
    return result;
  }

  // 行き帰り別モード: 行き・帰りで独立して実行
  const outboundCandidates = filterByDirection(drivers, "outbound");
  const inboundCandidates = filterByDirection(drivers, "inbound");

  if (outboundCandidates.length === 0 && inboundCandidates.length === 0) {
    return { error: "NO_DRIVERS" };
  }
  if (children.length === 0) {
    return { error: "NO_CHILDREN" };
  }

  const outboundResult = assignForDirection(
    outboundCandidates,
    children,
    "outbound",
    gradeGrouping,
    separateParentChild,
    numberOfCars
  );
  if (isAutoAssignError(outboundResult)) return outboundResult;

  const inboundResult = assignForDirection(
    inboundCandidates,
    children,
    "inbound",
    gradeGrouping,
    separateParentChild,
    numberOfCars
  );
  if (isAutoAssignError(inboundResult)) return inboundResult;

  return [...outboundResult, ...inboundResult];
}
