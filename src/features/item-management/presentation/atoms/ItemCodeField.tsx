import React from 'react';
import Input from '@/components/input';
import FormField from '@/components/form-field';

interface ItemCodeFieldProps {
  code: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}

export default function ItemCodeField({
  code,
  onChange,
  error,
}: ItemCodeFieldProps) {
  return (
    <FormField label="Kode Item" className="md:col-span-1">
      <Input
        name="code"
        value={code}
        onChange={onChange}
        placeholder="Masukkan kode item"
        className="w-full"
        error={error}
        required
      />
    </FormField>
  );
}
