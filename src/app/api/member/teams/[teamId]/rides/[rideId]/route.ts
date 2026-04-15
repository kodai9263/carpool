import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMemberPin } from "@/utils/pinCache";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { calcCurrentGrade } from "@/utils/gradeUtils";

export const runtime = "nodejs";

export const GET = async (request: NextRequest, { params }: { params: { teamId: string; rideId: string } }) => {
  const pin = request.headers.get('x-pin');
  const teamIdNum = Number(params.teamId);
  const rideIdNum = Number(params.rideId);
  if (!pin || !Number.isInteger(teamIdNum) || !Number.isInteger(rideIdNum)) {
    return NextResponse.json({ message: "権限がありません" }, { status: 401 });
  }

  const verified = await verifyMemberPin(teamIdNum, pin);
  if (verified === null) return NextResponse.json({ message: "チームが見つかりません" }, { status: 404 });
  if (!verified) return NextResponse.json({ message: "配車閲覧コードが正しくありません" }, { status: 401 });

  try {
    const driverSelect = {
      id: true,
      type: true,
      direction: true,
      availabilityDriverId: true,
      linkedDriverId: true,
      availabilityDriver: {
        select: {
          guardian: { select: { id: true, name: true } },
          seats: true,
          comment: true,
        },
      },
      rideAssignments: {
        select: {
          id: true,
          child: { select: { id: true, name: true, grade: true, gradeYear: true } },
        },
      },
    } as const;

    const [ride, children, members, allDrivers] = await prisma.$transaction([
      prisma.ride.findFirst({
        where: { id: rideIdNum, teamId: teamIdNum },
        select: {
          id: true,
          date: true,
          destination: true,
          separateDirections: true,
          availabilityDrivers: {
            select: {
              id: true,
              type: true,
              direction: true,
              guardian: { select: { id: true, name: true } },
              seats: true,
              availability: true,
              comment: true,
            },
          },
          childAvailabilities: {
            select: {
              childId: true,
              availability: true,
              selfDriving: true,
            },
          },
        },
      }),
      prisma.child.findMany({
        where: { member: { teamId: teamIdNum } },
        select: { id: true, name: true, memberId: true, grade: true, gradeYear: true },
        distinct: ["id"],
      }),
      prisma.guardian.findMany({
        where: { member: { teamId: teamIdNum } },
        select: { id: true, name: true, memberId: true },
        orderBy: { name: 'asc' },
      }),
      // ドライバー・引率者をフラットに取得し、アプリ層で結合（深いネスト解消）
      prisma.driver.findMany({
        where: { rideId: rideIdNum },
        select: driverSelect,
      }),
    ]);

    if (!ride) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });

    // 欠席の子供IDセット（rideAssignmentsから除外するため）
    const absentChildIds = new Set(
      (ride.childAvailabilities ?? [])
        .filter((ca) => !ca.availability && !ca.selfDriving)
        .map((ca) => ca.childId)
    );

    // linkedDriverId を使ってドライバーに引率者を紐付け
    type DriverRow = typeof allDrivers[number];
    const driverMap = new Map<number, DriverRow & { escorts: DriverRow[] }>(
      allDrivers
        .filter((d) => d.type === "driver")
        .map((d) => [d.id, { ...d, escorts: [] }])
    );
    for (const escort of allDrivers.filter((d) => d.type === "escort")) {
      if (escort.linkedDriverId) driverMap.get(escort.linkedDriverId)?.escorts.push(escort);
    }
    const drivers = [...driverMap.values()];

    return NextResponse.json({
      status: "OK",
      ride: {
        id: ride.id,
        date: ride.date.toISOString(),
        destination: ride.destination,
        drivers: drivers.map((driver) => ({
          ...driver,
          // 欠席の子供をrideAssignmentsから除外
          rideAssignments: driver.rideAssignments
            .filter((ra) => !absentChildIds.has(ra.child.id))
            .map((ra) => ({
              ...ra,
              child: {
                id: ra.child.id,
                name: ra.child.name,
                currentGrade: calcCurrentGrade(ra.child.grade, ra.child.gradeYear),
              },
            })),
          escorts: driver.escorts.map((escort) => ({
            id: escort.id,
            direction: escort.direction,
            availabilityDriverId: escort.availabilityDriverId,
            availabilityDriver: escort.availabilityDriver,
            // 引率者の担当からも欠席の子供を除外
            rideAssignments: escort.rideAssignments
              .filter((ra) => !absentChildIds.has(ra.child.id))
              .map((ra) => ({
                ...ra,
                child: {
                  id: ra.child.id,
                  name: ra.child.name,
                  currentGrade: calcCurrentGrade(ra.child.grade, ra.child.gradeYear),
                },
              })),
          })),
        })),
        separateDirections: ride.separateDirections,
        availabilityDrivers: ride.availabilityDrivers,
        children: children.map((child) => ({
          ...child,
          currentGrade: calcCurrentGrade(child.grade, child.gradeYear),
        })),
        guardians: members,
        childAvailabilities: ride.childAvailabilities,
      }
    } satisfies RideDetailResponse, { status: 200 });
  } catch {
    return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
  }
}
