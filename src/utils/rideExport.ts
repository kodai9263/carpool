import { RideDetailResponse } from "@/app/_types/response/rideResponse";

type Ride = RideDetailResponse["ride"];

function formatRideDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日(${dow[d.getDay()]})`;
}

function gradeLabel(grade: number | null): string {
  return grade !== null ? ` (${grade}年)` : "";
}

function buildDriverBlock(driver: Ride["drivers"][0]): string {
  const name = driver.availabilityDriver.guardian.name;
  const seats = driver.availabilityDriver.seats;
  const lines: string[] = [`🚗 ${name} (${seats}人乗り)`];

  for (const ra of driver.rideAssignments) {
    lines.push(`  ・${ra.child.name}${gradeLabel(ra.child.currentGrade)}`);
  }

  for (const escort of driver.escorts) {
    lines.push(`  🏃 引率: ${escort.availabilityDriver.guardian.name}`);
  }

  return lines.join("\n");
}

export function formatRideExportText(ride: Ride): string {
  const header =
    formatRideDate(ride.date) + (ride.destination ? ` ${ride.destination}` : "");

  const blocks: string[] = [header];

  if (ride.meetingPlace) {
    blocks.push(`集合場所: ${ride.meetingPlace}`);
  }

  if (ride.separateDirections) {
    const outbound = ride.drivers.filter((d) => d.direction === "outbound");
    const inbound = ride.drivers.filter((d) => d.direction === "inbound");

    if (outbound.length > 0) {
      blocks.push("【行き】");
      outbound.forEach((d) => blocks.push(buildDriverBlock(d)));
    }
    if (inbound.length > 0) {
      blocks.push("【帰り】");
      inbound.forEach((d) => blocks.push(buildDriverBlock(d)));
    }
  } else {
    ride.drivers.forEach((d) => blocks.push(buildDriverBlock(d)));
  }

  const selfDrivingNames = ride.childAvailabilities
    .filter((ca) => ca.selfDriving)
    .map((ca) => ride.children.find((c) => c.id === ca.childId)?.name)
    .filter((name): name is string => name !== undefined);

  if (selfDrivingNames.length > 0) {
    blocks.push(`🚲 自走: ${selfDrivingNames.join("・")}`);
  }

  return blocks.join("\n\n");
}
