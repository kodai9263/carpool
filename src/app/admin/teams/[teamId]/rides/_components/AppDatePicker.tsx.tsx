'use client';

import { ja } from "date-fns/locale";
import DatePicker from "react-datepicker";
import Holidays from 'japanese-holidays';

interface Props {
  value: Date | null;
  onChange: (value: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
};

export default function AppDatePicker({
  value,
  onChange,
  minDate,
  placeholder = '日付を選択してください',
  className = 'border border-gray-300 rounded px-3 py-3 w-full',
  wrapperClassName = 'w-full',
}: Props) {
  return (
    <DatePicker 
      locale={ja}
      selected={value}
      onChange={onChange}
      minDate={minDate}
      dayClassName={(date) => {
        if (Holidays.isHoliday(date)) return "bg-red-100 text-red-600 rounded-full"
        const day = date.getDay()
        if (day === 0) return "bg-red-100 text-red-600 rounded-full"
        if (day === 6) return "bg-blue-100 text-blue-600 rounded-full"
        return ""
      }}
      dateFormat="yyyy/MM/dd(EEE)"
      placeholderText={placeholder}
      showIcon
      wrapperClassName={wrapperClassName}
      className={className}
      />
  );
}