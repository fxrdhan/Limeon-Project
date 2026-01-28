import Input from '@/components/input';
import FormField from '@/components/form-field';

interface ItemCodeFieldProps {
  code: string;
  generatedCode?: string;
  error?: string;
}

export default function ItemCodeField({
  code,
  generatedCode,
  error,
}: ItemCodeFieldProps) {
  const displayCode = generatedCode || code;

  return (
    <FormField label="Kode Item" className="md:col-span-1">
      <Input
        name="code"
        value={displayCode}
        readOnly
        placeholder="Auto-generated"
        className="w-full bg-slate-50"
        error={error}
        required
      />
    </FormField>
  );
}
