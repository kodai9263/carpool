'use client';

import { Calendar, MapPin } from "lucide-react";

interface Props {
  date: Date | string;
  destination: string;
}

export default function RideBasicInfo({ 
  date,
  destination,
}: Props) {
  return (
    <div className="flex justify-center">
      <div className="space-y-10">
        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center">
            <Calendar size={28} />
          </div>
          <span className="w-20 text-xl">日付</span>
          <div className="w-80">
            <div className="border border-gray-300 rounded px-3 py-3 bg-gray-50">
              {new Date(date).toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center">
            <MapPin size={28} />
          </div>
          <span className="w-20 text-xl">行き先</span>
          <div className="w-80">
            <div className="border border-gray-300 rounded px-3 py-3 bg-gray-50">
              {destination}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}