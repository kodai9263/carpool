"use client";

import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useMemo } from "react";

type Ride = RideDetailResponse["ride"];

interface AttendanceViewProps {
  ride: Ride;
}

export function AttendanceView({ ride }: AttendanceViewProps) {
  // 参加者リスト（配車・引率への割り当てベース）
  const participants = useMemo(() => {
    const list: {
      child: { id: number; name: string; currentGrade: number | null };
      assignedTo: string;
      assignedType: "driver" | "escort";
    }[] = [];

    for (const driver of ride.drivers) {
      // 配車ドライバーの乗車する子供
      if (driver.type === "driver") {
        for (const assignment of driver.rideAssignments) {
          list.push({
            child: assignment.child,
            assignedTo: driver.availabilityDriver.guardian.name,
            assignedType: "driver",
          });
        }
        // 引率者が担当する子供
        for (const escort of driver.escorts) {
          for (const assignment of escort.rideAssignments) {
            list.push({
              child: assignment.child,
              assignedTo: escort.availabilityDriver.guardian.name,
              assignedType: "escort",
            });
          }
        }
      }
    }

    // 学年の降順でソート（未設定は末尾）
    list.sort((a, b) => {
      const gradeA = a.child.currentGrade ?? -1;
      const gradeB = b.child.currentGrade ?? -1;
      return gradeB - gradeA;
    });

    return list;
  }, [ride]);

  // 欠席者リスト（childAvailabilities.availability === false の子供）
  const absentees = useMemo(() => {
    const absentChildIds = new Set(
      ride.childAvailabilities
        .filter((ca) => !ca.availability)
        .map((ca) => ca.childId)
    );
    return ride.children
      .filter((c) => absentChildIds.has(c.id))
      .sort((a, b) => {
        const gradeA = a.currentGrade ?? -1;
        const gradeB = b.currentGrade ?? -1;
        return gradeB - gradeA;
      });
  }, [ride]);

  return (
    <div className="space-y-8">
      {/* 参加者セクション */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          ✅ 参加者一覧
          <span className="text-sm font-normal text-gray-500">
            （{participants.length}名）
          </span>
        </h2>
        {participants.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">
            配車に割り当てられた子供がいません
          </p>
        ) : (
          <div className="space-y-2">
            {participants.map((p, i) => (
              <div
                key={`participant-${p.child.id}-${i}`}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.child.name}</span>
                  {p.child.currentGrade != null && (
                    <span className="text-sm text-gray-500">
                      {p.child.currentGrade}年生
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 欠席者セクション */}
      <section>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          ❌ 欠席者一覧
          <span className="text-sm font-normal text-gray-500">
            （{absentees.length}名）
          </span>
        </h2>
        {absentees.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">
            欠席の子供はいません
          </p>
        ) : (
          <div className="space-y-2">
            {absentees.map((child) => (
              <div
                key={`absentee-${child.id}`}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <span className="font-medium">{child.name}</span>
                {child.currentGrade != null && (
                  <span className="text-sm text-gray-500">
                    {child.currentGrade}年生
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
