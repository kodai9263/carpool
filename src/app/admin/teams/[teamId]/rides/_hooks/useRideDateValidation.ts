import { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";

export function createRideDateValidation<T extends FieldValues>(methods: UseFormReturn<T>) {
  const validateDate = () => {
    if (!methods.getValues('date' as Path<T>)) {
      methods.setError('date' as Path<T>, { type: 'required' });
      return false;
    }
    return true;
  };

  const handleDateChange = (date: Date | null) => {
    methods.setValue('date' as Path<T>, date as PathValue<T, Path<T>>);
    if (date) {
      methods.clearErrors('date' as Path<T>);
    }
  };

  return { validateDate, handleDateChange };
}
