'use client';

import { Calendar, MapPin } from "lucide-react";
import { FieldValues, useFormContext, UseFormSetValue } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import AppDatePicker from "./AppDatePicker.tsx";

interface RideProps<T extends FieldValues> {
  setValue: UseFormSetValue<T>;
  date: Date | null;
};

export default function RideBasicForm<T extends FieldValues>({
  setValue,
  date
}: RideProps<T>) {
  const { register } = useFormContext<T>();
  return (
    <div className="space-y-10">
        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><Calendar size={28} /></div>
          <span className="w-20 text-xl">日付</span>

          <div className="flex-1">
            <AppDatePicker 
              value={date}
              onChange={(value) => setValue("date" as any, value as any)}
              minDate={new Date()}
            />
          </div>
          
        </div>

        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><MapPin size={28} /></div>
          <span className="w-20 text-xl">行き先</span>

          <input
            type="text"
            {...register("destination" as any, { required: true })}
            className="border border-gray-300 rounded px-3 py-3 flex-1"/>
        </div>
      </div>
  );
}