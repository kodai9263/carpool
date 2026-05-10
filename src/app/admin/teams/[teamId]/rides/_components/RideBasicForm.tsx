"use client";

import { Calendar, MapPin } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import AppDatePicker from "./AppDatePicker.tsx";

type RideBasicFormValues = {
  destination: string;
};

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
  const { register, control } = useFormContext<RideBasicFormValues>();

  const destination = useWatch({ control, name: "destination" });

  const hasDate = !!date;
  const hasDestination = !!destination;

  return (
    <div className="w-full space-y-6">
      {/* 日付 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 md:gap-0">
          <div className="mr-2 flex justify-center">
            <Calendar size={18} className="text-gray-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">日付</span>
        </div>

        <div className="w-full">
          <AppDatePicker
            value={date}
            onChange={onDateChange}
            minDate={new Date()}
            className={`app-input transition-colors duration-200 ${
              error ? "border-red-500" : "border-gray-300"
            } ${hasDate ? "bg-teal-50/70" : ""}`}
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">
              日付を選択してください
            </p>
          )}
        </div>
      </div>

      {/* 行き先 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 md:gap-0">
          <div className="mr-2 flex justify-center">
            <MapPin size={18} className="text-gray-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">行き先</span>
        </div>

        <input
          type="text"
          {...register("destination")}
          className={`app-input truncate transition-colors duration-200 ${
            hasDestination ? "bg-teal-50/70" : ""
          }`}
        />
      </div>
    </div>
  );
}
