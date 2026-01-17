"use client";

import { Calendar, MapPin } from "lucide-react";

interface Props {
  date: Date | string;
  destination: string;
}

export default function RideBasicInfo({ date, destination }: Props) {
  return (
    <div className="space-y-6 md:space-y-10 w-full">
      {/* 日付 */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
        <div className="flex items-center gap-2 md:gap-0">
          <div className="md:w-10 flex justify-center">
            <Calendar size={18} className="text-gray-500" />
          </div>
          <span className="md:w-20 text-base md:text-lg font-bold">日付</span>
        </div>

        <div className="w-full md:flex-1">
          <div className="border-2 border-gray-300 rounded px-3 py-3 bg-gray-50">
            {new Date(date).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* 行き先 */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
        <div className="flex items-center gap-2 md:gap-0">
          <div className="md:w-10 flex justify-center">
            <MapPin size={18} className="text-gray-500" />
          </div>
          <span className="md:w-20 text-base md:text-lg font-bold">行き先</span>
        </div>

        <div className="w-full md:flex-1">
          <div className="border-2 border-gray-300 rounded px-3 py-3 bg-gray-50">
            {destination}
          </div>
        </div>
      </div>
    </div>
  );
}
