import { RideDetailResponse, UpdateRideResponse } from "@/app/_types/response/rideResponse";
import { UpdateRideValues } from "@/app/_types/ride";
import { calcCurrentGrade, isGraduated } from "@/utils/gradeUtils";
import { prisma } from "@/lib/prisma";
import { withAdminTeamRide } from "@/utils/withAuth";
import {
  createDirectionalDriverIdMap,
  getDirectionalDriverId,
} from "@/utils/directionalDriverIdMap";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

class RideUpdateError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

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

      const [ride, rawChildren, allDrivers, guardians] = await prisma.$transaction([
        prisma.ride.findFirst({
          where: { id: rideId, teamId },
          select: {
            id: true,
            updatedAt: true,
            date: true,
            destination: true,
            meetingPlace: true,
            deadline: true,
            lockAfterDeadline: true,
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
                selfDriving: true,
              },
            },
          },
        }),
        prisma.child.findMany({
          where: { member: { teamId } },
          select: { id: true, name: true, memberId: true, grade: true, gradeYear: true },
        }),
        // ドライバー・引率者をフラットに取得し、アプリ層で結合（深いネスト解消）
        prisma.driver.findMany({
          where: { rideId },
          select: driverSelect,
        }),
        // 回答状況表示用にチームの全保護者を取得
        prisma.guardian.findMany({
          where: { member: { teamId } },
          select: { id: true, name: true, memberId: true },
          orderBy: { name: "asc" },
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
          updatedAt: ride.updatedAt.toISOString(),
          date: ride.date.toISOString(),
          destination: ride.destination,
          meetingPlace: ride.meetingPlace,
          deadline: ride.deadline ? ride.deadline.toISOString() : null,
          lockAfterDeadline: ride.lockAfterDeadline,
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
          guardians,
          childAvailabilities: ride.childAvailabilities,
        }
      } satisfies RideDetailResponse, { status: 200 });
    } catch {
      return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
    }
  }, ctx);

  // 配車更新(自分のチームのみ)
  export const PUT = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
    withAdminTeamRide(request, async({ teamId, rideId }) => {
      const body = await request.json().catch(() => null) as UpdateRideValues | null;

      if (!body) return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });

      if (!body.date) return NextResponse.json({ message: "日付を選択してください" }, { status: 400 });

      if (!Array.isArray(body.drivers)) {
        return NextResponse.json({ message: "配車の形式が正しくありません" }, { status: 400 });
      }

      const rideIdNum = Number(rideId);
      const date = new Date(body.date);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ message: "日付が正しくありません" }, { status: 400 });
      }

      if (body.expectedUpdatedAt !== undefined && typeof body.expectedUpdatedAt !== "string") {
        return NextResponse.json({ message: "更新時刻が正しくありません" }, { status: 400 });
      }
      const expectedUpdatedAt = body.expectedUpdatedAt === undefined
        ? null
        : new Date(body.expectedUpdatedAt);
      if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
        return NextResponse.json({ message: "更新時刻が正しくありません" }, { status: 400 });
      }

      // Webの未選択枠は除外する。更新は全件置換なので、残りの形を削除前に確認する。
      const driversToSave = body.drivers.filter((driver) =>
        body.separateDirections || driver?.direction !== "inbound"
      );
      const validDirection = (direction: string) => direction === "outbound" || direction === "inbound";
      const validId = (id: number) => Number.isInteger(id) && id > 0;
      const availabilityIds = new Set<number>();
      const childIds = new Set<number>();
      const assignedChildren = new Set<string>();
      const selectedPeople = new Set<string>();
      for (const driver of driversToSave) {
        if (!driver || !validId(driver.availabilityDriverId) || !validDirection(driver.direction ?? "outbound") ||
            !Array.isArray(driver.rideAssignments) || !Array.isArray(driver.escorts ?? [])) {
          return NextResponse.json({ message: "配車の形式が正しくありません" }, { status: 400 });
        }
        const driverDirection = driver.direction ?? "outbound";
        const driverKey = `${driver.availabilityDriverId}:${driverDirection}`;
        if (selectedPeople.has(driverKey)) {
          return NextResponse.json({ message: "同じ保護者を同じ方向に複数回選択しています" }, { status: 400 });
        }
        selectedPeople.add(driverKey);
        availabilityIds.add(driver.availabilityDriverId);
        for (const assignment of driver.rideAssignments) {
          if (!assignment?.childId) continue;
          if (!validId(assignment.childId)) return NextResponse.json({ message: "子どものIDが正しくありません" }, { status: 400 });
          const childKey = `${assignment.childId}:${driverDirection}`;
          if (assignedChildren.has(childKey)) return NextResponse.json({ message: "同じ子どもを同じ方向に複数回割り当てています" }, { status: 400 });
          assignedChildren.add(childKey);
          childIds.add(assignment.childId);
        }
        for (const escort of driver.escorts ?? []) {
          if (!escort || !validDirection(escort.direction ?? "outbound") || !Array.isArray(escort.rideAssignments)) {
            return NextResponse.json({ message: "引率者の形式が正しくありません" }, { status: 400 });
          }
          if (!escort.availabilityDriverId) continue;
          const escortDirection = escort.direction ?? "outbound";
          if (!validId(escort.availabilityDriverId) || escortDirection !== driverDirection) {
            return NextResponse.json({ message: "引率者のIDまたは方向が正しくありません" }, { status: 400 });
          }
          const escortKey = `${escort.availabilityDriverId}:${escortDirection}`;
          if (selectedPeople.has(escortKey)) {
            return NextResponse.json({ message: "同じ保護者を同じ方向に複数回選択しています" }, { status: 400 });
          }
          selectedPeople.add(escortKey);
          availabilityIds.add(escort.availabilityDriverId);
          for (const assignment of escort.rideAssignments) {
            if (!assignment?.childId) continue;
            if (!validId(assignment.childId)) return NextResponse.json({ message: "子どものIDが正しくありません" }, { status: 400 });
            const childKey = `${assignment.childId}:${escortDirection}`;
            if (assignedChildren.has(childKey)) return NextResponse.json({ message: "同じ子どもを同じ方向に複数回割り当てています" }, { status: 400 });
            assignedChildren.add(childKey);
            childIds.add(assignment.childId);
          }
        }
      }

      try {
        await prisma.$transaction(async (tx) => {
          // 親レコードを先にロックし、回答変更と割り当て保存を直列化する。
          const updated = await tx.ride.updateMany({
            where: {
              id: rideIdNum,
              teamId,
              ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
            },
            data: {
              date,
              destination: body.destination,
              meetingPlace: body.meetingPlace?.trim() || null,
              separateDirections: body.separateDirections ?? false,
            },
          });
          if (updated.count === 0) {
            throw new RideUpdateError(
              expectedUpdatedAt ? "配車が更新されています。再読み込みしてから保存してください" : "配車が見つかりません",
              expectedUpdatedAt ? 409 : 404,
            );
          }

          const [availablePeople, teamChildren] = await Promise.all([
            tx.availabilityDriver.findMany({
              where: { id: { in: [...availabilityIds] }, rideId: rideIdNum, teamId },
              select: { id: true, guardianId: true, type: true, direction: true, availability: true, seats: true },
            }),
            tx.child.findMany({
              where: { id: { in: [...childIds] }, member: { teamId } },
              select: { id: true },
            }),
          ]);
          if (availablePeople.length !== availabilityIds.size || teamChildren.length !== childIds.size) {
            throw new RideUpdateError("別の配車またはチームの回答・子どもは選択できません", 400);
          }
          const availableById = new Map(availablePeople.map((person) => [person.id, person]));
          const occupiedGuardians = new Set<string>();
          const reserveGuardian = (guardianId: number, direction: string) => {
            const key = `${guardianId}:${direction}`;
            if (occupiedGuardians.has(key)) {
              throw new RideUpdateError("同じ保護者を同じ方向の運転者と引率者に重複して選択できません", 400);
            }
            occupiedGuardians.add(key);
          };
          for (const driver of driversToSave) {
            const answer = availableById.get(driver.availabilityDriverId);
            if (answer?.type !== "driver" || !answer.availability ||
                (answer.direction !== "both" && (!body.separateDirections || answer.direction !== (driver.direction ?? "outbound")))) {
              throw new RideUpdateError(body.separateDirections
                ? "運転者の回答と方向が一致しません"
                : "往復共通の配車には、往復とも車出し可能と回答した運転者を選択してください", 400);
            }
            reserveGuardian(answer.guardianId, driver.direction ?? "outbound");
            const occupiedSeats = driver.rideAssignments.filter((assignment) => assignment.childId).length +
              (driver.escorts ?? []).filter((escort) => escort.availabilityDriverId).length;
            if (occupiedSeats > answer.seats) {
              throw new RideUpdateError("乗車人数が座席数を超えています", 400);
            }
            for (const escort of driver.escorts ?? []) {
              if (!escort.availabilityDriverId) continue;
              const escortAnswer = availableById.get(escort.availabilityDriverId);
              if (escortAnswer?.type !== "escort" || !escortAnswer.availability ||
                  (escortAnswer.direction !== "both" && (!body.separateDirections || escortAnswer.direction !== (escort.direction ?? "outbound")))) {
                throw new RideUpdateError(body.separateDirections
                  ? "引率者の回答と方向が一致しません"
                  : "往復共通の配車には、往復とも引率可能と回答した保護者を選択してください", 400);
              }
              reserveGuardian(escortAnswer.guardianId, escort.direction ?? "outbound");
            }
          }

          // 既存のDriverとAssignmentを削除（引率者も含む）
          await tx.rideAssignment.deleteMany({ where: { rideId: rideIdNum } });
          await tx.driver.deleteMany({ where: { rideId: rideIdNum } });

          // 1. ドライバーを一括作成しIDを取得（N回 → 1クエリ）
          const createdDrivers = await tx.driver.createManyAndReturn({
            data: driversToSave.map((d) => ({
              rideId: rideIdNum,
              availabilityDriverId: d.availabilityDriverId,
              type: "driver",
              direction: d.direction ?? "outbound",
            })),
            select: { id: true, availabilityDriverId: true, direction: true },
          });

          // 同じ号車を行き・帰りで使う場合も区別してdriver.idを取得する
          const driverIdMap = createDirectionalDriverIdMap(createdDrivers);

          // 2. ドライバーの子供割当を一括作成（N回 → 1クエリ）
          const allDriverAssignments = driversToSave.flatMap((d) => {
            const driverId = getDirectionalDriverId(
              driverIdMap,
              d.availabilityDriverId,
              d.direction,
            );
            return d.rideAssignments
              .filter((ra) => ra.childId && ra.childId !== 0)
              .map((ra) => ({ rideId: rideIdNum, driverId, childId: ra.childId }));
          });
          if (allDriverAssignments.length > 0) {
            await tx.rideAssignment.createMany({ data: allDriverAssignments });
          }

          // 3. 引率者を一括作成しIDを取得（E回 → 1クエリ）
          const allEscortData = driversToSave.flatMap((d) => {
            const linkedDriverId = getDirectionalDriverId(
              driverIdMap,
              d.availabilityDriverId,
              d.direction,
            );
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

          let escortIdMap = new Map<string, number>();
          if (allEscortData.length > 0) {
            const createdEscorts = await tx.driver.createManyAndReturn({
              data: allEscortData,
              select: { id: true, availabilityDriverId: true, direction: true },
            });
            escortIdMap = createDirectionalDriverIdMap(createdEscorts);
          }

          // 4. 引率者の子供割当を一括作成（E回 → 1クエリ）
          const allEscortAssignments = driversToSave.flatMap((d) =>
            (d.escorts ?? [])
              .filter((e) => e.availabilityDriverId && e.availabilityDriverId !== 0)
              .flatMap((e) => {
                const escortId = getDirectionalDriverId(
                  escortIdMap,
                  e.availabilityDriverId,
                  e.direction,
                );
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
        if (e instanceof RideUpdateError) {
          return NextResponse.json({ message: e.message }, { status: e.status });
        }
        console.error(e);
        if (e && typeof e === 'object' && 'code' in e && e.code === "P2002") return NextResponse.json({ message: "同じ子供を複数回選択しています" }, { status: 400 });
        return NextResponse.json({ message: "サーバー内部でエラーが発生しました" }, { status: 500 });
      }
  }, ctx);

  // 回答期限の更新
  export const PATCH = (request: NextRequest, ctx: { params: { teamId: string; rideId: string } }) =>
    withAdminTeamRide(request, async({ rideId }) => {
      const body = await request.json().catch(() => null) as { deadline: string | null; lockAfterDeadline?: boolean } | null;

      if (!body) return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400 });

      try {
        await prisma.ride.update({
          where: { id: rideId },
          data: {
            deadline: body.deadline ? new Date(body.deadline) : null,
            // 未指定の場合は変更しない（後方互換のため）
            ...(typeof body.lockAfterDeadline === "boolean"
              ? { lockAfterDeadline: body.lockAfterDeadline }
              : {}),
          },
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
