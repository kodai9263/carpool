"use client";

import { CarFront, MessageSquare, PersonStanding, User } from "lucide-react";

interface RideAssignment {
  id: number;
  child: { name: string; currentGrade: number | null };
}

interface Participant {
  id: number;
  availabilityDriver: {
    guardian: { name: string };
    seats?: number;
    comment: string | null;
  };
  rideAssignments: RideAssignment[];
}

interface Props {
  driver: Participant & {
    type: string;
    escorts: Participant[];
  };
}

export default function RideDriverCard({ driver }: Props) {
  return (
    <div className="min-w-0 space-y-4 overflow-hidden rounded-xl border border-white/80 bg-white/95 p-4 shadow-[0_14px_34px_rgba(15,118,110,0.08)] ring-1 ring-gray-950/[0.02] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,118,110,0.12)] md:p-5">
      {/* ドライバー名 */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <CarFront size={22} />
        </span>
        <div
          className="min-w-0 flex-1 text-base font-bold text-gray-950 line-clamp-2 break-all overflow-wrap-anywhere"
          title={`${driver.availabilityDriver.guardian.name}号`}
        >
          {driver.availabilityDriver.guardian.name}号
        </div>
      </div>

      {/* ドライバーのコメント */}
      {driver.availabilityDriver.comment && (
        <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <span>{driver.availabilityDriver.comment}</span>
        </div>
      )}

      {/* 乗車する子供 */}
      <div className="space-y-2 min-w-0">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">乗車する子供</h3>
        {driver.rideAssignments.length > 0 ? (
          <div className="space-y-2">
            {[...driver.rideAssignments]
              .sort((a, b) => (b.child.currentGrade ?? -1) - (a.child.currentGrade ?? -1))
              .map((assignment) => (
                <div
                  key={assignment.id}
                    className="flex items-center gap-2 min-w-0 rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                >
                  <User size={18} className="text-gray-600 flex-shrink-0" />
                  <span
                    className="text-sm min-w-0 flex-1 line-clamp-2 break-all overflow-wrap-anywhere"
                    title={assignment.child.name}
                  >
                    {assignment.child.name}
                    {assignment.child.currentGrade != null && (
                      <span className="text-xs text-gray-500 ml-1">（{assignment.child.currentGrade}年）</span>
                    )}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-500">未割当</p>
        )}
      </div>

      {/* 引率者（いる場合のみ表示） */}
      {driver.escorts.length > 0 && (
        <div className="pt-3 border-t border-gray-100 space-y-2 min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">引率者</h3>
          {driver.escorts.map((escort) => (
            <div key={escort.id} className="space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <PersonStanding size={16} className="text-teal-600 flex-shrink-0" />
                <span className="text-sm font-medium min-w-0 flex-1 break-all">
                  {escort.availabilityDriver.guardian.name}
                </span>
              </div>
              {/* 引率者のコメント */}
              {escort.availabilityDriver.comment && (
                <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{escort.availabilityDriver.comment}</span>
                </div>
              )}
              {escort.rideAssignments.length > 0 && (
                <div className="ml-6 space-y-1">
                  {[...escort.rideAssignments]
                    .sort((a, b) => (b.child.currentGrade ?? -1) - (a.child.currentGrade ?? -1))
                    .map((ra) => (
                      <div
                        key={ra.id}
                        className="flex items-center gap-1.5 rounded border border-gray-100 bg-gray-50/80 px-2 py-1.5"
                      >
                        <User size={14} className="text-gray-500 flex-shrink-0" />
                        <span className="text-xs min-w-0 flex-1 break-all">
                          {ra.child.name}
                          {ra.child.currentGrade != null && (
                            <span className="text-gray-400 ml-1">（{ra.child.currentGrade}年）</span>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
