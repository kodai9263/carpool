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
    <div className="border-2 border-gray-200 rounded-xl p-4 md:p-5 shadow-sm space-y-4 bg-gray-50 hover:shadow-md transition-shadow min-w-0 overflow-hidden">
      {/* ドライバー名 */}
      <div className="flex items-center gap-3 min-w-0">
        <CarFront size={24} className="text-teal-700 flex-shrink-0" />
        <div
          className="min-w-0 flex-1 font-medium text-base line-clamp-2 break-all overflow-wrap-anywhere"
          title={`${driver.availabilityDriver.guardian.name}号`}
        >
          {driver.availabilityDriver.guardian.name}号
        </div>
      </div>

      {/* ドライバーのコメント */}
      {driver.availabilityDriver.comment && (
        <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-100 border border-orange-200 px-2 py-1.5 rounded">
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <span>{driver.availabilityDriver.comment}</span>
        </div>
      )}

      {/* 乗車する子供 */}
      <div className="space-y-2 min-w-0">
        <h3 className="text-sm font-medium text-gray-700 mb-2">乗車する子供</h3>
        {driver.rideAssignments.length > 0 ? (
          <div className="space-y-2">
            {[...driver.rideAssignments]
              .sort((a, b) => (b.child.currentGrade ?? -1) - (a.child.currentGrade ?? -1))
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-2 min-w-0 bg-white p-3 rounded-lg border border-gray-200"
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
          <p className="text-xs text-gray-400">未割当</p>
        )}
      </div>

      {/* 引率者（いる場合のみ表示） */}
      {driver.escorts.length > 0 && (
        <div className="pt-3 border-t border-gray-200 space-y-2 min-w-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">🚶 引率者</h3>
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
                <div className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-100 border border-orange-200 px-2 py-1.5 rounded">
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
                        className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border border-gray-200"
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
