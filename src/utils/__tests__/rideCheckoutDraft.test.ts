import { parseRideCheckoutDraft, rideCheckoutDraftKey, serializeRideCheckoutDraft, type RideCheckoutDraft } from "../rideCheckoutDraft";

const draft: RideCheckoutDraft = {
  values: {
    date: new Date("2026-09-15T00:00:00.000Z"), destination: "運動場", meetingPlace: "学校",
    separateDirections: true,
    drivers: [{ availabilityDriverId: 2, type: "driver", direction: "outbound", seats: 3,
      rideAssignments: [{ childId: 4 }], escorts: [{ availabilityDriverId: 5, direction: "outbound", rideAssignments: [{ childId: 6 }] }] }],
  },
  deadline: "2026-09-14", lockAfterDeadline: true,
};

test("決済往復後も日付・割り当て・引率・期限の未保存入力が戻る", () => {
  expect(parseRideCheckoutDraft(serializeRideCheckoutDraft(draft, 1000), 2000)).toEqual(draft);
});

test("管理者と配車が違う下書きを参照しない", () => {
  expect(rideCheckoutDraftKey("user-a", "1", "2")).not.toBe(rideCheckoutDraftKey("user-b", "1", "2"));
  expect(rideCheckoutDraftKey("user-a", "1", "2")).not.toBe(rideCheckoutDraftKey("user-a", "1", "3"));
});

test("古い下書き・壊れたデータ・日付不正は復元しない", () => {
  expect(parseRideCheckoutDraft(serializeRideCheckoutDraft(draft, 0), 86400001)).toBeNull();
  expect(parseRideCheckoutDraft("{broken")).toBeNull();
  expect(parseRideCheckoutDraft(JSON.stringify({ ...draft, savedAt: 1000, values: { ...draft.values, date: "invalid" } }), 1000)).toBeNull();
  expect(parseRideCheckoutDraft(JSON.stringify({ ...draft, savedAt: 1000, values: { ...draft.values, drivers: [{}] } }), 1000)).toBeNull();
});
