import { RideDetailResponse, UpdateRideResponse } from "@/app/_types/response/rideResponse";
import { UpdateRideValues } from "@/app/_types/ride"; 
import { withAdminTeamRide } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// 配車詳細取得(自分のチームのみ)
export const GET = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ teamId, rideId }) => {
    try {
      const [ride, children] = await prisma.$transaction([
        prisma.ride.findFirst({
          where: { id: rideId, teamId },
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
            team: {
              select: {
                availabilityDrivers: {
                  where: {
                    rideId: rideId,
                  },
                  select: {
                    id: true,
                    member: { select: { id: true, name: true } },
                    seats: true,
                    availability: true,
                  },
                },
              },
            },
          },
        }),
        prisma.child.findMany({
          where: { member: { teamId } },
          select: { id: true, name: true, memberId: true },
          distinct: ["id"],
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
          availabilityDrivers: ride.team.availabilityDrivers,
          children,
        }
      } satisfies RideDetailResponse, { status: 200 });
    } catch {
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

  // 配車更新(自分のチームのみ)
  export const PUT = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
    withAdminTeamRide(request, async({ rideId }) => {
      const body = await request.json().catch(() => null) as UpdateRideValues | null;

      if (!body) return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });
      
      if (!body.date) return NextResponse.json({ message: "日付を選択してください" }, { status: 400 });

      const rideIdNum = Number(rideId);
      const date = new Date(body.date);

      try {
        await prisma.$transaction(async (tx) => {
          // Ride自体を更新
          await tx.ride.update({
            where: { id: rideIdNum },
            data: { date, destination: body.destination },
          });

          // 既存のDriverとAssignmentを削除
          await tx.rideAssignment.deleteMany({ where: { rideId: rideIdNum } });
          await tx.driver.deleteMany({ where: { rideId: rideIdNum } });

          // 新しいDriverとAssignmentを作成
          for (const driver of body.drivers ?? []) {
            await tx.availabilityDriver.update({
              where: { id: driver.availabilityDriverId },
              data: { rideId: rideIdNum},
            });

            const newDriver = await tx.driver.create({
              data: {
                rideId: rideIdNum,
                availabilityDriverId: driver.availabilityDriverId,
              },
            });

            // 子供割当作成
            // childIdが0の場合はスキップ
            const validAssignments = driver.rideAssignments.filter((child) => child.childId && child.childId !== 0);

            if (validAssignments.length > 0) {
              const assignment = validAssignments.map((child) => ({
                rideId: rideIdNum,
                driverId: newDriver.id,
                childId: child.childId,
              }));
              
              await tx.rideAssignment.createMany({ data: assignment });
            }
          }
        });

        return NextResponse.json(
          { status: "OK", message: "更新しました" } satisfies UpdateRideResponse, { status: 200 });
      } catch (e) {
        console.error(e);
        if (e && typeof e === 'object' && 'code' in e && e.code === "P2002") return NextResponse.json({ message: "同じ子供を複数回選択しています" }, { status: 400 });
        return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
  }, ctx);

  // 配車削除
export const DELETE = (request: NextRequest, ctx: { params: {teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ teamId, rideId }) => {
    try {
      await prisma.ride.delete({
        where: {id: rideId, teamId },
      });
      return NextResponse.json({ status: "OK", message: "削除しました" }, { status: 200 });
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === "P2025") return NextResponse.json({ message: "not found" }, { status: 400 });
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);