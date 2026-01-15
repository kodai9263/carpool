import { FieldValues, UseFormReturn } from "react-hook-form";

export function createRideDateValidation<T extends FieldValues>(methods: UseFormReturn<T>) {
  const validateDate = () => {
    if (!methods.getValues('date' as any)) {
      methods.setError('date' as any, { type: 'required' });
      return false;
    }
    return true;
  };

  const handleDateChange = (date: Date | null) => {
    methods.setValue('date' as any, date as any);
    if (date) {
      methods.clearErrors('date' as any);
    }
  };

  return { validateDate, handleDateChange };
}
