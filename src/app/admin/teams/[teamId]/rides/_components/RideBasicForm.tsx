'use client';

import { Calendar, MapPin } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import AppDatePicker from "./AppDatePicker.tsx";

interface RideProps {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
  error?: boolean;
}

export default function RideBasicForm({
  date,
  onDateChange,
  error,
}: RideProps) {
  const { register, control } = useFormContext();

  const destination = useWatch({ control, name: "destination" as any});

  const hasDate = !!date;
  const hasDestination = !!destination;

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

        <div className="w-full md:w-96">
          <AppDatePicker
            value={date}
            onChange={onDateChange}
            minDate={new Date()}
            className={`border-2 rounded px-3 py-3 w-full transition-colors duration-200 ${error ? 'border-red-500' : 'border-gray-300'} ${hasDate ? 'bg-blue-50' : ''}`}
          />
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

        <input
          type="text"
          {...register("destination" as any)}
          className={`w-full md:w-96 border-2 border-gray-300 rounded px-3 py-3 focus:border-[#356963] focus:ring-2 focus:ring-[#356963] focus:outline-none transition-colors duration-200 ${hasDestination ? 'bg-blue-50' : ''}`}
        />
      </div>
    </div>
  );
}