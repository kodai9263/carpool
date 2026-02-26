import { RideDetailResponse, UpdateRideResponse } from "@/app/_types/response/rideResponse";
import { UpdateRideValues } from "@/app/_types/ride"; 
import { calcCurrentGrade, isGraduated } from "@/utils/gradeUtils";
import { withAdminTeamRide } from "@/utils/withAuth";
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export const runtime = "nodejs";

// 配車詳細取得(自分のチームのみ)
// チーム名とPINコードも含めて返す
export const GET = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ teamId, rideId }) => {
    try {
      const [ride, rawChildren, team] = await prisma.$transaction([
        prisma.ride.findFirst({
          where: { id: rideId, teamId },
          select: {
            id: true,
            date: true,
            destination: true,
            deadline: true,
            drivers: {
              select: {
                id: true,
                availabilityDriverId: true,
                availabilityDriver: {
                  select: {
                    guardian: { select: { id: true, name: true } }, 
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
            team: {
              select: {
                teamName: true,
                pin: true,
                availabilityDrivers: {
                  where: {
                    rideId: rideId,
                  },
                  select: {
                    id: true,
                    guardian: { select: { id: true, name: true } },
                    seats: true,
                    availability: true,
                    comment: true,
                  },
                },
              },
            },
            childAvailabilities: {
              where: { rideId },
              select: {
                childId: true,
                availability: true,
              },
            },
          },
        }),
        prisma.child.findMany({
          where: { member: { teamId } },
          select: { id: true, name: true, memberId: true, grade: true, gradeYear: true },
          distinct: ["id"],
        }),
        prisma.team.findFirst({
          where: { id: teamId },
          select: { maxGrade: true },
        }),
      ]);
      
      if (!ride) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });

      const maxGrade = team?.maxGrade ?? 6;

      // 現在の学年を計算し、卒業した子供を除外
      const children = rawChildren
        .map((child) => ({
          ...child,
          currentGrade: calcCurrentGrade(child.grade, child.gradeYear),
        }))
        .filter((child) => !isGraduated(child.currentGrade, maxGrade))
        .sort((a, b) => {
          // 学年降順（高学年が先）、未設定が末尾
          if (a.currentGrade === null && b.currentGrade === null) return 0;
          if (a.currentGrade === null) return 1;
          if (b.currentGrade === null) return -1;
          return b.currentGrade - a.currentGrade;
        })
      
      return NextResponse.json({
        status: "OK",
        ride: {
          id: ride.id,
          date: ride.date.toISOString(),
          destination: ride.destination,
          deadline: ride.deadline ? ride.deadline.toISOString() : null,
          drivers: ride.drivers.map((driver) => ({
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
          availabilityDrivers: ride.team.availabilityDrivers,
          children,
          teamName: ride.team.teamName,
          pin: ride.team.pin,
          childAvailabilities: ride.childAvailabilities,
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

  // 回答期限の更新
  export const PATCH = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
    withAdminTeamRide(request, async({ rideId }) => {
      const body = await request.json().catch(() => null) as { deadline: string | null } | null;

      if (!body) return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });

      try {
        await prisma.ride.update({
          where: { id: rideId },
          data: { deadline: body.deadline ? new Date(body.deadline) : null },
        });

        return NextResponse.json({ status: "OK", message: "回答期限を更新しました" }, { status: 200 });
      } catch {
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