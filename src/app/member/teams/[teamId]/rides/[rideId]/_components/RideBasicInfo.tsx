"use client";

import { Calendar, MapPin, MapPinned } from "lucide-react";
import { useState } from "react";

interface Props {
  date: Date | string;
  destination: string;
  meetingPlace?: string | null;
}

type ExpandableField = "destination" | "meetingPlace";

export default function RideBasicInfo({ date, destination, meetingPlace }: Props) {
  const [expandedField, setExpandedField] = useState<ExpandableField | null>(null);

  const toggleField = (field: ExpandableField) => {
    setExpandedField((current) => (current === field ? null : field));
  };

  return (
    <div className="app-panel w-full space-y-4 p-4 md:p-5">
      {/* 日付 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 md:gap-0">
          <div className="mr-2 flex justify-center">
            <Calendar size={18} className="text-gray-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">日付</span>
        </div>

        <div className="w-full">
          <div className="rounded-lg border border-teal-100 bg-teal-50/70 px-3 py-3 font-semibold text-gray-950">
            {new Date(date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
        </div>
      </div>

      <div className={`grid gap-4 ${meetingPlace ? "md:grid-cols-2" : ""}`}>
        {/* 行き先 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:gap-0">
            <div className="mr-2 flex justify-center">
              <MapPin size={18} className="text-gray-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">行き先</span>
          </div>

          <div className="w-full min-w-0">
            <div
              className={`overflow-wrap-anywhere cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50 break-all ${
                expandedField === "destination" ? "" : "line-clamp-3"
              }`}
              onClick={() => toggleField("destination")}
              title={destination}
            >
              {destination}
            </div>
          </div>
        </div>

        {meetingPlace && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:gap-0">
              <div className="mr-2 flex justify-center">
                <MapPinned size={18} className="text-gray-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">集合場所</span>
            </div>

            <div className="w-full min-w-0">
              <div
                className={`overflow-wrap-anywhere cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-3 text-gray-800 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50 break-all ${
                  expandedField === "meetingPlace" ? "" : "line-clamp-3"
                }`}
                onClick={() => toggleField("meetingPlace")}
                title={meetingPlace}
              >
                {meetingPlace}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
