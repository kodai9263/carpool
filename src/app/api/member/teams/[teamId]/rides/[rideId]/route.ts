import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";

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
                  child: { select: { id: true, name: true } },
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
            },
          },
        },
      }),
      prisma.child.findMany({
        where: { member: { teamId: teamIdNum } },
        select: { id: true, name: true, memberId: true },
        distinct: ["id"],
      }),
      prisma.member.findMany({
        where: { teamId: teamIdNum },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    if (!ride) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });

    return NextResponse.json({
      status: "OK",
      ride: {
        id: ride.id,
        date: ride.date.toISOString(),
        destination: ride.destination,
        drivers: ride.drivers,
        availabilityDrivers: ride.availabilityDrivers,
        children,
        members,
      }
    } satisfies RideDetailResponse, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
  }
}