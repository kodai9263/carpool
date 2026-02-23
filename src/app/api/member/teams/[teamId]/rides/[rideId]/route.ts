import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
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

  const team = await prisma.team.findFirst({
    where: { id: teamIdNum },
    select: { viewPinHash: true },
  });
  if (!team?.viewPinHash) return NextResponse.json({ message: "チームが見つかりません" }, { status: 404 });

  const ok = await bcrypt.compare(pin, team.viewPinHash);
  if (!ok) return NextResponse.json({ message: "配車閲覧コードが正しくありません" }, { status: 401 });

  try {
    const [ride, children, members] = await prisma.$transaction([
      prisma.ride.findFirst({
        where: { id: rideIdNum, teamId: teamIdNum },
        select: {
          id: true,
          date: true,
          destination: true,
          drivers: {
            select: {
              id: true,
              availabilityDriverId: true,
              availabilityDriver: {
                select: {
                  member: { select: { id: true, name: true } },
                  seats:true,
                }
              },
              rideAssignments: {
                select: {
                  id: true,
                  child: { select: { id: true, name: true, grade: true, gradeYear: true } },
                },
              },
            },
          },
          availabilityDrivers: {
            select: {
              id: true,
              member: { select: { id: true, name: true } },
              seats: true,
              availability: true,
              comment: true,
            },
          },
          childAvailabilities: {
            select: {
              childId: true,
              availability: true,
            },
          },
        },
      }),
      prisma.child.findMany({
        where: { member: { teamId: teamIdNum } },
        select: { id: true, name: true, memberId: true, grade: true, gradeYear: true },
        distinct: ["id"],
      }),
      prisma.member.findMany({
        where: { teamId: teamIdNum },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!ride) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rideData = ride as any;

    return NextResponse.json({
      status: "OK",
      ride: {
        id: rideData.id,
        date: rideData.date.toISOString(),
        destination: rideData.destination,
        drivers: rideData.drivers.map((driver: { id: number; availabilityDriverId: number; availabilityDriver: { member: { id: number; name: string }; seats: number }; rideAssignments: { id: number; child: { id: number; name: string; grade: number | null; gradeYear: number | null } }[] }) => ({
          ...driver,
          rideAssignments: driver.rideAssignments.map((ra) => ({
            ...ra,
            child: {
              id: ra.child.id,
              name: ra.child.name,
              currentGrade: calcCurrentGrade(ra.child.grade, ra.child.gradeYear),
            },
          })),
        })),
        availabilityDrivers: ride.availabilityDrivers,
        children: children.map((child) => ({
          ...child,
          currentGrade: calcCurrentGrade(child.grade, child.gradeYear),
        })),
        members,
        childAvailabilities: ride.childAvailabilities,
      }
    } satisfies RideDetailResponse, { status: 200 });
  } catch {
    return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
  }
}