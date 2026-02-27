import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { AvailabilityFormValues } from "@/app/_types/availability";
import { AvailabilityResponse } from "@/app/_types/response/availabilityResponse";

export const runtime = "nodejs";

export const POST = async (request: NextRequest, { params }: { params: { teamId: string; rideId: string } }) => {
  const pin = request.headers.get("x-pin");
  const teamIdNum = Number(params.teamId);
  const rideIdNum = Number(params.rideId);

  const body = await request.json().catch(() => null) as AvailabilityFormValues | null;
  const { guardianId, driverAvailability, seats, driverComment,
          escortAvailability, escortComment, childAvailabilities } = body ?? {};

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
  const team = await prisma.team.findFirst({ where: { id: teamIdNum }, select: { viewPinHash: true } });
  if (!team?.viewPinHash) return NextResponse.json({ message: "チームが見つかりません" }, { status: 404 });
  const ok = await bcrypt.compare(pin, team.viewPinHash);
  if (!ok) return NextResponse.json({ message: "配車閲覧コードが正しくありません" }, { status: 401 });

  try {
    const data = await prisma.$transaction(async (tx) => {
      // 1. 配車レコードをupsert（type: "driver"）
      const driverRecord = await tx.availabilityDriver.upsert({
        where: { rideId_guardianId_type: { rideId: rideIdNum, guardianId: guardianId!, type: "driver" } },
        update: {
          availability: driverAvailability,
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
          seats: 0,
          comment: escortComment || null,
        },
        select: { id: true, availability: true },
      });

      if (childAvailabilities && childAvailabilities.length > 0) {
        for (const ca of childAvailabilities) {
          await tx.childAvailability.upsert({
            where: { rideId_childId: { rideId: rideIdNum, childId: ca.childId } },
            update: { availability: ca.availability },
            create: { rideId: rideIdNum, childId: ca.childId, availability: ca.availability },
          });
        }
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