'use client';

import { RideFormValues } from "@/app/_types/ride";
import { Calendar, MapPin } from "lucide-react";
import { UseFormRegister } from "react-hook-form";

interface RideProps {
  register: UseFormRegister<RideFormValues>;
};

export default function RideBasicForm({ register }: RideProps) {
  return (
    <div className="px-10 py-8 rounded bg-white space-y-12 shadow-sm w-[480px] ml-[-72px]">
        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><Calendar size={28} /></div>
          <span className="w-20 text-xl">日付</span>

          <input 
            type="date"
            {...register("date", { required: "日付を選択してください。" })}
            className="border border-gray-300 rounded px-3 py-3 flex-1"
          />
        </div>

        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><MapPin size={28} /></div>
          <span className="w-20 text-xl">行き先</span>

          <input
            type="text"
            {...register("destination", { required: true })}
            className="border border-gray-300 rounded px-3 py-3 flex-1"/>
        </div>
      </div>
  );
}