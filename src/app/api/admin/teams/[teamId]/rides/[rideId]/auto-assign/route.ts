import { prisma } from "@/lib/prisma";
import { calcCurrentGrade } from "@/utils/gradeUtils";
import { autoAssign, isAutoAssignError } from "@/utils/autoAssign";
import { consumeAutoAssignFreeUse, getAutoAssignBillingStatus } from "@/utils/billingServer";
import { trackServerEvent } from "@/utils/serverAnalytics";
import { withAdminTeamRide } from "@/utils/withAuth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 自動割り当て実行（DBには保存せず、フォーム値を返すだけ）
export const POST = (
  request: NextRequest,
  ctx: { params: { teamId: string; rideId: string } }
) =>
  withAdminTeamRide(
    request,
    async ({ adminId, teamId, rideId }) => {
      try {
        const body = await request.json();
        const numberOfCars: number | undefined =
          body.numberOfCars !== undefined && body.numberOfCars !== null && body.numberOfCars !== ""
            ? Number(body.numberOfCars)
            : undefined;
        const gradeGrouping = "mix" as const;
        const separateParentChild: boolean = body.separateParentChild === true;

        const autoAssignBilling = await getAutoAssignBillingStatus(adminId);
        if (!autoAssignBilling.canUseAutoAssign) {
          await trackServerEvent(
            "auto_assign_limit_reached",
            {
              admin_id: adminId,
              team_id: teamId,
              ride_id: rideId,
              plan: autoAssignBilling.plan,
              free_limit: autoAssignBilling.freeLimit,
              used: autoAssignBilling.used,
            },
            { adminId, request },
          );

          return NextResponse.json(
            {
              message: "無料で試せる自動割り当ての回数を使い切りました。Proプランで無制限に使えます。",
              code: "AUTO_ASSIGN_LIMIT_REACHED",
              billing: autoAssignBilling,
            },
            { status: 402 },
          );
        }

        // 必要なデータを並列取得
        const [ride, availabilityDrivers, children, pastDrivers] = await Promise.all([
          // 配車の基本情報（separateDirectionsフラグ）
          prisma.ride.findFirst({
            where: { id: rideId, teamId },
            select: { separateDirections: true },
          }),

          // 今回の配車に回答したドライバー候補（guardianのmemberIdも取得）
          prisma.availabilityDriver.findMany({
            where: { rideId, teamId, type: "driver", availability: true },
            select: {
              id: true,
              seats: true,
              direction: true,
              guardian: {
                select: {
                  id: true,
                  memberId: true, // 親子チェック用
                },
              },
            },
          }),

          // 参加可能な子ども（不参加・自走を除外）
          prisma.child.findMany({
            where: {
              member: { teamId },
              NOT: {
                childAvailabilities: {
                  some: {
                    rideId,
                    OR: [{ availability: false }, { selfDriving: true }],
                  },
                },
              },
            },
            select: {
              id: true,
              grade: true,
              gradeYear: true,
              memberId: true,
            },
          }),

          // 過去の運転回数を集計するためのDriverレコード取得
          prisma.driver.findMany({
            where: {
              type: "driver",
              availabilityDriver: { teamId },
            },
            select: {
              availabilityDriver: {
                select: { guardianId: true },
              },
            },
          }),
        ]);

        if (!ride) {
          return NextResponse.json(
            { message: "配車が見つかりません" },
            { status: 404 }
          );
        }

        // guardianId 単位で過去の運転回数を集計
        const guardianDriveCountMap = new Map<number, number>();
        for (const d of pastDrivers) {
          const gId = d.availabilityDriver.guardianId;
          guardianDriveCountMap.set(gId, (guardianDriveCountMap.get(gId) ?? 0) + 1);
        }

        // autoAssign 関数に渡す入力を組み立て
        const driverCandidates = availabilityDrivers.map((d) => ({
          availabilityDriverId: d.id,
          seats: d.seats,
          direction: d.direction as "outbound" | "inbound" | "both",
          guardianMemberId: d.guardian.memberId,
          pastDriveCount: guardianDriveCountMap.get(d.guardian.id) ?? 0,
        }));

        const childCandidates = children.map((c) => ({
          id: c.id,
          grade: calcCurrentGrade(c.grade, c.gradeYear),
          memberId: c.memberId,
        }));

        // 自動割り当て実行
        const result = autoAssign({
          drivers: driverCandidates,
          children: childCandidates,
          numberOfCars,
          gradeGrouping,
          separateDirections: ride.separateDirections,
          separateParentChild,
        });

        if (isAutoAssignError(result)) {
          const messageMap: Record<string, string> = {
            NO_DRIVERS: "ドライバーの回答がありません",
            NO_CHILDREN: "参加できる子どもがいません",
            INSUFFICIENT_SEATS:
              numberOfCars !== undefined
                ? `${numberOfCars}台では座席数が足りません`
                : "座席数が足りません（全ドライバーの座席数が参加人数より少ないか、親子ルールで全員乗れません）",
          };
          return NextResponse.json(
            {
              message: messageMap[result.error] ?? "自動割り当てに失敗しました",
              minimumCars: result.minimumCars,
            },
            { status: 422 }
          );
        }

        // UpdateRideValues["drivers"] の形式に変換して返す
        const drivers = result.map((d) => ({
          availabilityDriverId: d.availabilityDriverId,
          type: "driver",
          direction: d.direction,
          seats: d.seats,
          rideAssignments: d.rideAssignments,
          escorts: [],
        }));

        const updatedAutoAssignBilling = await consumeAutoAssignFreeUse(adminId);

        await trackServerEvent(
          "auto_assign_used",
          {
            admin_id: adminId,
            team_id: teamId,
            ride_id: rideId,
            number_of_cars: numberOfCars ?? "auto",
            separate_parent_child: separateParentChild,
            driver_count: drivers.length,
            child_count: childCandidates.length,
            plan: updatedAutoAssignBilling.plan,
            free_limit: updatedAutoAssignBilling.freeLimit,
            remaining_free_uses: updatedAutoAssignBilling.remaining,
          },
          { adminId, request },
        );

        return NextResponse.json(
          { drivers, billing: updatedAutoAssignBilling },
          { status: 200 },
        );
      } catch (e) {
        console.error("自動割り当てエラー:", e);
        return NextResponse.json(
          { message: "自動割り当てに失敗しました" },
          { status: 500 }
        );
      }
    },
    ctx
  );
