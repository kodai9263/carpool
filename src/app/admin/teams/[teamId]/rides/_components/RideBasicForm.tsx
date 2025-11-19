'use client';

import { RideFormValues } from "@/app/_types/ride";
import { Calendar, MapPin } from "lucide-react";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { ja } from 'date-fns/locale/ja';
import Holidays from 'japanese-holidays';

interface RideProps {
  register: UseFormRegister<RideFormValues>;
  setValue: UseFormSetValue<RideFormValues>;
  date: Date | null;
};

export default function RideBasicForm({ register, setValue, date }: RideProps) {
  return (
    <div className="px-10 py-8 rounded bg-white space-y-12 shadow-sm w-[480px] ml-[-72px]">
        <div className="flex items-center space-x-6">
          <div className="w-10 flex justify-center"><Calendar size={28} /></div>
          <span className="w-20 text-xl">日付</span>

          <div className="flex-1">
              <DatePicker 
              locale={ja}
              selected={date}
              onChange={(value) => setValue("date", value as Date)}
              minDate={new Date()}
              dayClassName={(date) => {
                if (Holidays.isHoliday(date)) return "bg-red-100 text-red-600 rounded-full"
                const day = date.getDay()
                if (day === 0) return "bg-red-100 text-red-600 rounded-full"
                if (day === 6) return "bg-blue-100 text-blue-600 rounded-full"
                return ""
              }}
              dateFormat="yyyy/MM/dd(EEE)"
              placeholderText="日付を選択してください"
              showIcon
              wrapperClassName="w-full"
              className="border border-gray-300 rounded px-3 py-3 w-full"
            />
          </div>
          
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