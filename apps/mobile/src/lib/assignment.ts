import type { RideDetailResponse } from '../types/api';

type Ride = RideDetailResponse['ride'];
export type Direction = 'outbound' | 'inbound';

export interface AssignmentDriver {
  availabilityDriverId: number;
  type: 'driver';
  direction: Direction;
  seats: number;
  rideAssignments: { childId: number }[];
  escorts: {
    availabilityDriverId: number;
    direction: Direction;
    rideAssignments: { childId: number }[];
  }[];
}

export interface UpdateAssignmentBody {
  date: string;
  destination: string;
  meetingPlace: string | null;
  separateDirections: boolean;
  expectedUpdatedAt: string;
  drivers: AssignmentDriver[];
}

export function createAssignmentDraft(ride: Ride): AssignmentDriver[] {
  return ride.drivers
    .filter((driver) => driver.type === 'driver')
    .map((driver) => ({
      availabilityDriverId: driver.availabilityDriverId,
      type: 'driver',
      direction: driver.direction === 'inbound' ? 'inbound' : 'outbound',
      seats: driver.availabilityDriver.seats,
      rideAssignments: driver.rideAssignments.map(({ child }) => ({ childId: child.id })),
      escorts: driver.escorts.map((escort) => ({
        availabilityDriverId: escort.availabilityDriverId,
        direction: escort.direction === 'inbound' ? 'inbound' : 'outbound',
        rideAssignments: escort.rideAssignments.map(({ child }) => ({ childId: child.id })),
      })),
    }));
}

export function assignedChildIds(drivers: AssignmentDriver[], direction: Direction): Set<number> {
  const ids = new Set<number>();
  for (const driver of drivers) {
    if (driver.direction !== direction) continue;
    for (const assignment of driver.rideAssignments) ids.add(assignment.childId);
    for (const escort of driver.escorts) {
      for (const assignment of escort.rideAssignments) ids.add(assignment.childId);
    }
  }
  return ids;
}

function supportsDirection(ride: Ride, answerDirection: string, direction: Direction): boolean {
  return answerDirection === 'both' || Boolean(ride.separateDirections && answerDirection === direction);
}

export function availableDriverCandidates(ride: Ride, drivers: AssignmentDriver[], direction: Direction) {
  const answers = new Map(ride.availabilityDrivers.map((answer) => [answer.id, answer]));
  const usedGuardians = new Set<number>();
  for (const driver of drivers.filter((item) => item.direction === direction)) {
    for (const person of [driver, ...driver.escorts]) {
      const answer = answers.get(person.availabilityDriverId);
      if (answer) usedGuardians.add(answer.guardian.id);
    }
  }
  return ride.availabilityDrivers.filter((answer) =>
    answer.type === 'driver' && answer.availability && answer.seats > 0 &&
    supportsDirection(ride, answer.direction, direction) &&
    !usedGuardians.has(answer.guardian.id));
}

export function assignmentError(ride: Ride, drivers: AssignmentDriver[]): string | null {
  const candidates = new Map(ride.availabilityDrivers.map((answer) => [answer.id, answer]));
  for (const direction of (ride.separateDirections ? ['outbound', 'inbound'] : ['outbound']) as Direction[]) {
    const usedDrivers = new Set<number>();
    const usedGuardians = new Set<number>();
    const usedChildren = new Set<number>();
    for (const driver of drivers.filter((item) => item.direction === direction)) {
      const answer = candidates.get(driver.availabilityDriverId);
      if (!answer || !answer.availability || answer.type !== 'driver' ||
          !supportsDirection(ride, answer.direction, direction)) {
        return ride.separateDirections
          ? 'この方向に車出し可能と回答した保護者を選び直してください。'
          : '往復とも車出し可能と回答した保護者を選び直してください。';
      }
      for (const escort of driver.escorts) {
        const escortAnswer = candidates.get(escort.availabilityDriverId);
        if (!escortAnswer?.availability || escortAnswer.type !== 'escort' || escort.direction !== direction ||
            !supportsDirection(ride, escortAnswer.direction, direction)) {
          return ride.separateDirections
            ? 'この方向に引率可能と回答した保護者を選び直してください。'
            : '往復とも引率可能と回答した保護者を選び直してください。';
        }
      }
      if (usedDrivers.has(driver.availabilityDriverId)) return '同じ車が重複しています。';
      usedDrivers.add(driver.availabilityDriverId);
      for (const person of [driver, ...driver.escorts]) {
        const personAnswer = candidates.get(person.availabilityDriverId);
        if (!personAnswer) return '回答が変更された保護者がいます。再読み込みしてください。';
        if (usedGuardians.has(personAnswer.guardian.id)) {
          return '同じ保護者を同じ方向に運転者・引率者として重複して割り当てることはできません。';
        }
        usedGuardians.add(personAnswer.guardian.id);
      }
      if (driver.rideAssignments.length + driver.escorts.length > answer.seats) {
        return `${answer.guardian.name}号の乗車人数が座席数を超えています。`;
      }
      for (const childId of [
        ...driver.rideAssignments.map((item) => item.childId),
        ...driver.escorts.flatMap((escort) => escort.rideAssignments.map((item) => item.childId)),
      ]) {
        if (usedChildren.has(childId)) return '同じ子どもが同じ方向に複数回割り当てられています。';
        usedChildren.add(childId);
      }
    }
  }
  return null;
}

export function buildUpdateAssignmentBody(ride: Ride, drivers: AssignmentDriver[]): UpdateAssignmentBody {
  return {
    date: ride.date,
    destination: ride.destination,
    meetingPlace: ride.meetingPlace ?? null,
    separateDirections: Boolean(ride.separateDirections),
    expectedUpdatedAt: ride.updatedAt,
    drivers,
  };
}

export interface AutoAssignBillingStatus {
  plan: 'free' | 'pro';
  isPro: boolean;
  isExempt: boolean;
  freeLimit: number;
  used: number;
  remaining: number;
  canUseAutoAssign: boolean;
}

// 既存APIが保持しない引率設定と、未回答を参加扱いする動作を保護する。
export function autoAssignmentBlockReason(ride: Ride, draft: AssignmentDriver[]): string | null {
  if (draft.some((driver) => driver.escorts.length > 0) ||
      ride.drivers.some((driver) => driver.escorts.length > 0)) {
    return '引率者を設定済みの配車は、自動で作り直せません。下の画面で手動調整してください。';
  }
  const answered = new Set(ride.childAvailabilities.map((answer) => answer.childId));
  if (ride.children.some((child) => !answered.has(child.id))) {
    return '子どもの参加回答が揃ってから自動割り当てを使えます。入力依頼を共有してください。';
  }
  if (!ride.childAvailabilities.some((answer) => answer.availability && !answer.selfDriving)) {
    return '乗車する子どもの参加回答がありません。';
  }
  return null;
}

export function autoAssignmentResultError(ride: Ride, drivers: AssignmentDriver[]): string | null {
  const error = assignmentError(ride, drivers);
  if (error) return error;
  const participating = new Set(ride.childAvailabilities
    .filter((answer) => answer.availability && !answer.selfDriving)
    .map((answer) => answer.childId));
  const directions: Direction[] = ride.separateDirections ? ['outbound', 'inbound'] : ['outbound'];
  if (drivers.some((driver) => !directions.includes(driver.direction))) {
    return '配車案の往復設定が変わっています。再読み込みしてください。';
  }
  for (const direction of directions) {
    const assigned = assignedChildIds(drivers, direction);
    if (assigned.size !== participating.size || [...participating].some((id) => !assigned.has(id))) {
      return '参加回答が変わった可能性があります。配車案は適用していません。再読み込みしてください。';
    }
  }
  return null;
}
