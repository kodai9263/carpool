import { prisma } from "@/lib/prisma";
import { verifyMemberPin } from "@/utils/pinCache";
import { NextRequest, NextResponse } from "next/server";
import { AvailabilityFormValues } from "@/app/_types/availability";
import { AvailabilityResponse } from "@/app/_types/response/availabilityResponse";

export const runtime = "nodejs";

export const POST = async (request: NextRequest, { params }: { params: { teamId: string; rideId: string } }) => {
  const pin = request.headers.get("x-pin");
  const teamIdNum = Number(params.teamId);
  const rideIdNum = Number(params.rideId);

  const body = await request.json().catch(() => null) as AvailabilityFormValues | null;
  const { guardianId, driverAvailability, driverDirection, seats, driverComment,
          escortAvailability, escortDirection, escortComment, childAvailabilities } = body ?? {};

  if (!pin || !Number.isInteger(teamIdNum) || !Number.isInteger(rideIdNum)) {
    return NextResponse.json({ message: "権限がありません" }, { status: 401 });
  }
  if (!body || !Number.isInteger(guardianId)
    || typeof driverAvailability !== "boolean"
    || typeof escortAvailability !== "boolean"
    || !Number.isInteger(seats)) {
    return NextResponse.json({ message: "リクエストの形式が正しくありません" }, { status: 400});
  }

  // PIN認可
  const verified = await verifyMemberPin(teamIdNum, pin);
  if (verified === null) return NextResponse.json({ message: "チームが見つかりません" }, { status: 404 });
  if (!verified) return NextResponse.json({ message: "配車閲覧コードが正しくありません" }, { status: 401 });

  try {
    const data = await prisma.$transaction(async (tx) => {
      // 1. 配車レコードをupsert（type: "driver"）
      const driverRecord = await tx.availabilityDriver.upsert({
        where: { rideId_guardianId_type: { rideId: rideIdNum, guardianId: guardianId!, type: "driver" } },
        update: {
          availability: driverAvailability,
          direction: driverDirection ?? "both",
          seats,
          comment: driverComment || null,
          teamId: teamIdNum,
        },
        create: {
          rideId: rideIdNum,
          guardianId: guardianId!,
          teamId: teamIdNum,
          type: "driver",
          availability: driverAvailability,
          direction: driverDirection ?? "both",
          seats,
          comment: driverComment || null,
        },
        select: { id: true, availability: true, seats: true, comment: true, guardianId: true, rideId: true },
      });

      // 2. 引率レコードをupsert（type: "escort"）
      const escortRecord = await tx.availabilityDriver.upsert({
        where: { rideId_guardianId_type: { rideId: rideIdNum, guardianId: guardianId!, type: "escort" } },
        update: {
          availability: escortAvailability,
          direction: escortDirection ?? "both",
          seats: 0,
          comment: escortComment || null,
          teamId: teamIdNum,
        },
        create: {
          rideId: rideIdNum,
          guardianId: guardianId!,
          teamId: teamIdNum,
          type: "escort",
          availability: escortAvailability,
          direction: escortDirection ?? "both",
          seats: 0,
          comment: escortComment || null,
        },
        select: { id: true, availability: true },
      });

      if (childAvailabilities && childAvailabilities.length > 0) {
        const childIds = childAvailabilities.map((c) => c.childId);
        // 対象childIdの既存レコードを一括削除してから一括作成（N回upsert → 2クエリに削減）
        await tx.childAvailability.deleteMany({
          where: { rideId: rideIdNum, childId: { in: childIds } },
        });
        await tx.childAvailability.createMany({
          data: childAvailabilities.map((c) => ({
            rideId: rideIdNum,
            childId: c.childId,
            availability: c.availability,
            selfDriving: c.selfDriving ?? false,
          })),
        });
      }

      // 3. 不可になった場合は既存の割当を削除
      if (!driverAvailability) {
        await tx.driver.deleteMany({ where: { rideId: rideIdNum, availabilityDriverId: driverRecord.id } });
      }
      if (!escortAvailability) {
        await tx.driver.deleteMany({ where: { rideId: rideIdNum, availabilityDriverId: escortRecord.id } });
      }

      return driverRecord;
    });

    return NextResponse.json(
      { status: "OK", message: "更新しました", availabilityDriver: data } satisfies AvailabilityResponse,
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "サーバ内部でエラーが発生しました" }, { status: 500 });
  }
};