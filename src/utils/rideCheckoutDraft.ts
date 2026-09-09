import type { UpdateRideValues } from "@/app/_types/ride";

export type RideCheckoutDraft = {
  values: UpdateRideValues;
  deadline: string;
  lockAfterDeadline: boolean;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function rideCheckoutDraftKey(userId: string, teamId: string, rideId: string) {
  return `ride-checkout:v1:${userId}:${teamId}:${rideId}`;
}

export function serializeRideCheckoutDraft(draft: RideCheckoutDraft, now = Date.now()) {
  return JSON.stringify({ ...draft, savedAt: now });
}

// 決済から戻る同じタブの入力だけを復元する。古いデータや不正な形は採用しない。
export function parseRideCheckoutDraft(raw: string | null, now = Date.now()): RideCheckoutDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (!draft || !Number.isFinite(draft.savedAt) || now < draft.savedAt || now - draft.savedAt > MAX_AGE_MS) return null;
    const values = draft.values;
    if (!values || typeof values.destination !== "string" ||
      (values.meetingPlace != null && typeof values.meetingPlace !== "string") ||
      typeof values.separateDirections !== "boolean" || !Array.isArray(values.drivers) ||
      typeof draft.deadline !== "string" || typeof draft.lockAfterDeadline !== "boolean") return null;

    const validAssignments = (rows: unknown) => Array.isArray(rows) && rows.every(
      (row) => row && Number.isInteger(row.childId) && row.childId >= 0,
    );
    const validDirection = (value: unknown) => value === "outbound" || value === "inbound";
    if (!values.drivers.every((driver: UpdateRideValues["drivers"][number]) =>
      driver && Number.isInteger(driver.availabilityDriverId) && driver.availabilityDriverId >= 0 &&
      typeof driver.type === "string" && validDirection(driver.direction) && Number.isFinite(driver.seats) &&
      validAssignments(driver.rideAssignments) && Array.isArray(driver.escorts) &&
      driver.escorts.every((escort) => escort && Number.isInteger(escort.availabilityDriverId) &&
        escort.availabilityDriverId >= 0 && validDirection(escort.direction) && validAssignments(escort.rideAssignments)),
    )) return null;

    if (values.date !== null && (typeof values.date !== "string" || Number.isNaN(new Date(values.date).getTime()))) return null;
    return {
      values: { ...values, date: values.date === null ? null : new Date(values.date) },
      deadline: draft.deadline,
      lockAfterDeadline: draft.lockAfterDeadline,
    };
  } catch {
    return null;
  }
}
