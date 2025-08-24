import React from 'react';
import SmartInput from '@/components/inputs/SmartInput';
import { useItemManagement } from '../../shared/contexts/useItemFormContext';

interface SmartItemFormFieldProps {
  fieldName: keyof typeof formDataMapping;
  label: string;
  type?: 'text' | 'number' | 'email';
  placeholder?: string;
  className?: string;
}

// Mapping for form field names to actual form data keys
const formDataMapping = {
  itemName: 'name',
  itemCode: 'code',
  barcode: 'barcode',
  description: 'description',
  basePrice: 'base_price',
  sellPrice: 'sell_price',
  minStock: 'min_stock',
  quantity: 'quantity',
} as const;

/**
 * Smart Item Form Field with Real-time Conflict Resolution
 *
 * Example usage in ItemBasicInfoForm:
 * <SmartItemFormField
 *   fieldName="itemName"
 *   label="Nama Item"
 *   placeholder="Masukkan nama item..."
 * />
 */
const SmartItemFormField: React.FC<SmartItemFormFieldProps> = ({
  fieldName,
  label,
  type = 'text',
  placeholder,
  className,
}) => {
  const { form, formActions, realtime } = useItemManagement();

  const actualFieldName = formDataMapping[fieldName];
  const fieldValue = form.formData[actualFieldName];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    if (type === 'number') {
      const numericValue = parseFloat(value) || 0;
      formActions.updateFormData({ [actualFieldName]: numericValue });
    } else {
      formActions.updateFormData({ [actualFieldName]: value });
    }
  };

  return (
    <SmartInput
      fieldName={actualFieldName}
      value={String(fieldValue || '')}
      onChange={handleChange}
      smartFormSync={realtime?.smartFormSync}
      label={label}
      type={type}
      placeholder={placeholder}
      className={className}
    />
  );
};

export default SmartItemFormField;

// Usage examples in form components:
/*
// In ItemBasicInfoForm.tsx:
import SmartItemFormField from '../atoms/SmartItemFormField';

// Replace regular input:
// <input name="name" value={formData.name} onChange={onChange} />

// With smart input:
<SmartItemFormField 
  fieldName="itemName"
  label="Nama Item"
  placeholder="Contoh: Panadol Extra" 
/>

<SmartItemFormField 
  fieldName="itemCode"
  label="Kode Item"
  placeholder="Contoh: ITM001" 
/>

<SmartItemFormField 
  fieldName="basePrice"
  label="Harga Dasar"
  type="number"
  placeholder="0" 
/>
*/
