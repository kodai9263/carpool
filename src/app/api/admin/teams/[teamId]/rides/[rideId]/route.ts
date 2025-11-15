import { RideDetailResponse, UpdateRideResponse } from "@/app/_types/response/ride";
import { UpdateRideValues } from "@/app/_types/ride";
import { withAdminTeamRide } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// 配車詳細取得(自分のチームのみ)
export const GET = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ adminId, teamId, rideId }) => {
    try {
      const ride = await prisma.ride.findFirst({
        where: { id: rideId, teamId },
        select: {
          id: true,
          date: true,
          destination: true,
          drivers: {
            select: {
              id: true,
              availabilityDriver: {
                select: {
                  member: { select: { id: true, name: true } },
                  seats: true,
                },
              },
              rideAssignments: {
                select: {
                  id: true,
                  child: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });
      if (!ride) return NextResponse.json({ status: "not found" }, { status: 404 });
      return NextResponse.json({
        status: "OK",
        ride: {
          ...ride,
          date: ride.date.toISOString(),
        },
      } satisfies RideDetailResponse, { status: 200 });
    } catch (e: any) {
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

  // 配車更新(自分のチームのみ)
  export const PUT = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
    withAdminTeamRide(request, async({ adminId, teamId, rideId }) => {
      const body = await request.json().catch(() => null) as UpdateRideValues | null;

      if (!body) return NextResponse.json({ status: "リクエストの形式が正しくありません" }, { status: 400 });
      
      if (!body.date) return NextResponse.json({ status: "日付を選択してください" }, { status: 400 });

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
          await tx.rideAssignment.deleteMany({ where: { id: rideIdNum } });
          await tx.driver.deleteMany({ where: { id: rideIdNum } });

          // 新しいDriverとAssignmentを作成
          for (const driver of body.drivers ?? []) {
            const newDriver = await tx.driver.create({
              data: {
                rideId: rideIdNum,
                availabilityDriverId: driver.availabilityDriverId,
              },
            });

            // 子供割当作成
            if (driver.rideAssignments.length > 0) {
              await tx.rideAssignment.createMany({
                data: driver.rideAssignments.map((child) => ({
                  rideId: rideIdNum,
                  driverId: newDriver.id,
                  childId: child.childId,
                })),
              });
            }
          }
        });

        return NextResponse.json(
          { status: "OK", message: "更新しました" } satisfies UpdateRideResponse, { status: 200 });
      } catch (e: any) {
        return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
  }, ctx);

  // 配車削除
export const DELETE = (request: NextRequest, ctx: { params: {teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ adminId, teamId, rideId }) => {
    try {
      await prisma.ride.delete({
        where: {id: rideId, teamId },
      });
      return NextResponse.json({ status: "OK", message: "削除しました" }, { status: 200 });
    } catch(e: any) {
      if (e.code === "P2025") return NextResponse.json({ status: "not found" }, { status: 400 });
      return NextResponse.json({ status: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);