import { RideDetailResponse, UpdateRideResponse } from "@/app/_types/response/rideResponse";
import { UpdateRideValues } from "@/app/_types/ride";
import { calcCurrentGrade, isGraduated } from "@/utils/gradeUtils";
import { prisma } from "@/lib/prisma";
import { withAdminTeamRide } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 配車詳細取得(自分のチームのみ)
// チーム名とPINコードも含めて返す
export const GET = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
  withAdminTeamRide(request, async({ teamId, rideId }) => {
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

      const [ride, rawChildren, allDrivers] = await prisma.$transaction([
        prisma.ride.findFirst({
          where: { id: rideId, teamId },
          select: {
            id: true,
            date: true,
            destination: true,
            deadline: true,
            separateDirections: true,
            team: {
              select: {
                teamName: true,
                pin: true,
                maxGrade: true,
              },
            },
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
        // ドライバー・引率者をフラットに取得し、アプリ層で結合（深いネスト解消）
        prisma.driver.findMany({
          where: { rideId },
          select: driverSelect,
        }),
      ]);

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

      if (!ride) return NextResponse.json({ message: "配車が見つかりません" }, { status: 404 });

      const maxGrade = ride?.team.maxGrade ?? 6;

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
          separateDirections: ride.separateDirections,
          drivers: drivers.map((driver) => ({
            ...driver,
            rideAssignments: driver.rideAssignments.map((ra) => ({
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
              rideAssignments: escort.rideAssignments.map((ra) => ({
                ...ra,
                child: {
                  id: ra.child.id,
                  name: ra.child.name,
                  currentGrade: calcCurrentGrade(ra.child.grade, ra.child.gradeYear),
                },
              })),
            })),
          })),
          availabilityDrivers: ride.availabilityDrivers,
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
            data: { date, destination: body.destination, separateDirections: body.separateDirections ?? false },
          });

          // 既存のDriverとAssignmentを削除（引率者も含む）
          await tx.rideAssignment.deleteMany({ where: { rideId: rideIdNum } });
          await tx.driver.deleteMany({ where: { rideId: rideIdNum } });

          // separateDirections=false の場合、inbound ドライバーは保存しない
          const driversToSave = (body.drivers ?? []).filter(
            (d) => body.separateDirections || d.direction !== "inbound"
          );

          // 1. availabilityDriverを一括更新（N回 → 1クエリ）
          await tx.availabilityDriver.updateMany({
            where: { id: { in: driversToSave.map((d) => d.availabilityDriverId) } },
            data: { rideId: rideIdNum },
          });

          // 2. ドライバーを一括作成しIDを取得（N回 → 1クエリ）
          const createdDrivers = await tx.driver.createManyAndReturn({
            data: driversToSave.map((d) => ({
              rideId: rideIdNum,
              availabilityDriverId: d.availabilityDriverId,
              type: "driver",
              direction: d.direction ?? "outbound",
            })),
            select: { id: true, availabilityDriverId: true },
          });

          // availabilityDriverId → driver.id のマップ
          const driverIdMap = new Map(createdDrivers.map((d) => [d.availabilityDriverId, d.id]));

          // 3. ドライバーの子供割当を一括作成（N回 → 1クエリ）
          const allDriverAssignments = driversToSave.flatMap((d) => {
            const driverId = driverIdMap.get(d.availabilityDriverId)!;
            return d.rideAssignments
              .filter((ra) => ra.childId && ra.childId !== 0)
              .map((ra) => ({ rideId: rideIdNum, driverId, childId: ra.childId }));
          });
          if (allDriverAssignments.length > 0) {
            await tx.rideAssignment.createMany({ data: allDriverAssignments });
          }

          // 4. 引率者を一括作成しIDを取得（E回 → 1クエリ）
          const allEscortData = driversToSave.flatMap((d) => {
            const linkedDriverId = driverIdMap.get(d.availabilityDriverId)!;
            return (d.escorts ?? [])
              .filter((e) => e.availabilityDriverId && e.availabilityDriverId !== 0)
              .map((e) => ({
                rideId: rideIdNum,
                availabilityDriverId: e.availabilityDriverId,
                type: "escort",
                direction: e.direction ?? "outbound",
                linkedDriverId,
              }));
          });

          const escortIdMap = new Map<number, number>();
          if (allEscortData.length > 0) {
            const createdEscorts = await tx.driver.createManyAndReturn({
              data: allEscortData,
              select: { id: true, availabilityDriverId: true },
            });
            for (const e of createdEscorts) escortIdMap.set(e.availabilityDriverId, e.id);
          }

          // 5. 引率者の子供割当を一括作成（E回 → 1クエリ）
          const allEscortAssignments = driversToSave.flatMap((d) =>
            (d.escorts ?? [])
              .filter((e) => e.availabilityDriverId && e.availabilityDriverId !== 0)
              .flatMap((e) => {
                const escortId = escortIdMap.get(e.availabilityDriverId)!;
                return e.rideAssignments
                  .filter((ra) => ra.childId && ra.childId !== 0)
                  .map((ra) => ({ rideId: rideIdNum, driverId: escortId, childId: ra.childId }));
              })
          );
          if (allEscortAssignments.length > 0) {
            await tx.rideAssignment.createMany({ data: allEscortAssignments });
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
