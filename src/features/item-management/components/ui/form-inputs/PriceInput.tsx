import Input from "@/components/input";
import FormField from "@/components/form-field";
import type { PriceInputProps } from "../../../types";

export default function PriceInput({
  label,
  name,
  value,
  onChange,
  tabIndex,
  validationSchema,
  required = false,
  min = "0",
  className = "w-full",
}: PriceInputProps) {
  return (
    <FormField label={label} required={required}>
      <Input
        type="currency"
        name={name}
        tabIndex={tabIndex}
        value={value}
        onChange={onChange}
        min={min}
        className={className}
        validate={!!validationSchema}
        validationSchema={validationSchema}
        showValidationOnBlur={true}
        validationAutoHide={true}
        validationAutoHideDelay={3000}
        required={required}
      />
    </FormField>
  );
}