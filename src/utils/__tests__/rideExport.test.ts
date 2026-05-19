import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { formatRideExportText } from "../rideExport";

type Ride = RideDetailResponse["ride"];

const baseRide: Ride = {
  id: 1,
  date: "2026-05-20T00:00:00.000Z",
  destination: "テストグラウンド",
  meetingPlace: "学校正門",
  separateDirections: false,
  drivers: [],
  availabilityDrivers: [],
  children: [],
  childAvailabilities: [],
};

describe("formatRideExportText", () => {
  test("集合場所がある場合は共有テキストに含める", () => {
    const text = formatRideExportText(baseRide);

    expect(text).toContain("集合場所: 学校正門");
  });

  test("集合場所がない場合は共有テキストに含めない", () => {
    const text = formatRideExportText({ ...baseRide, meetingPlace: null });

    expect(text).not.toContain("集合場所:");
  });
});
