import Input from '@/components/input';
import FormField from '@/components/form-field';
import type { z } from 'zod';

interface PriceInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tabIndex?: number;
  validationSchema?: z.ZodSchema;
  required?: boolean;
  min?: string;
  className?: string;
  readOnly?: boolean;
}

export default function PriceInput({
  label,
  name,
  value,
  onChange,
  tabIndex,
  validationSchema,
  required = false,
  min = '0',
  className = 'w-full',
  readOnly = false,
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
        readOnly={readOnly}
      />
    </FormField>
  );
}
