import { useMemo, useEffect, useRef, useState } from 'react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { itemQuantitySchema } from '@/schemas/manual/itemValidation';
import type { DropdownOption } from '@/types/components';
import { createOptimizedUnitDetailFetcher } from '@/utils/optimizedCategoryDetailFetcher';

interface ItemAdditionalInfoFormProps {
  formData: {
    barcode: string;
    quantity: number;
    unit_id: string;
    description: string;
  };
  units: DropdownOption[];
  loading: boolean;
  disabled?: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onDropdownChange: (field: string, value: string) => void;
}

const ItemAdditionalInfoForm: React.FC<ItemAdditionalInfoFormProps> = ({
  formData,
  units,
  loading,
  disabled = false,
  onChange,
  onDropdownChange,
}) => {
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quantityTouched, setQuantityTouched] = useState(false);

  const optimizedUnitDetailFetcher = useMemo(() => {
    return createOptimizedUnitDetailFetcher(units);
  }, [units]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white mb-6 overflow-hidden">
      <div className="bg-white px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Info Tambahan
        </h2>
      </div>

      <div className="p-4 md:p-5 space-y-5">
        <FormField label="Barcode">
          <Input
            name="barcode"
            value={formData.barcode}
            tabIndex={8}
            onChange={onChange}
            className="w-full"
            placeholder="Masukkan barcode item"
            readOnly={disabled}
          />
        </FormField>

        <div className="flex flex-row gap-4">
          {formData.unit_id ? (
            <FormField label="Nilai" className="flex-[1]">
              <Input
                name="quantity"
                type="number"
                value={
                  formData.quantity > 0 ? formData.quantity.toString() : ''
                }
                tabIndex={10}
                onChange={onChange}
                className="w-full"
                min="0"
                step="1"
                readOnly={disabled}
                validate={quantityTouched}
                validationSchema={itemQuantitySchema}
                showValidationOnBlur={true}
                validationAutoHide={true}
                validationAutoHideDelay={3000}
                ref={quantityInputRef}
                onFocus={() => setQuantityTouched(true)}
              />
            </FormField>
          ) : null}

          <FormField
            label="Satuan"
            className={formData.unit_id ? 'flex-[9]' : 'flex-1'}
          >
            {loading && units.length === 0 ? (
              <Input value="Memuat satuan..." readOnly disabled />
            ) : (
              <Dropdown
                name="unit_id"
                tabIndex={9}
                value={formData.unit_id}
                onChange={value => {
                  setQuantityTouched(false);
                  onDropdownChange('unit_id', value);

                  if (!disabled && value) {
                    if (focusTimerRef.current) {
                      clearTimeout(focusTimerRef.current);
                    }
                    focusTimerRef.current = setTimeout(() => {
                      quantityInputRef.current?.focus();
                    }, 200);
                  }
                }}
                options={units}
                placeholder="Pilih Satuan"
                enableHoverDetail={true}
                hoverDetailDelay={400}
                onFetchHoverDetail={optimizedUnitDetailFetcher}
                disabled={disabled}
              />
            )}
          </FormField>
        </div>

        <DescriptiveTextarea
          label="Keterangan"
          tabIndex={11}
          name="description"
          value={formData.description}
          onChange={onChange}
          placeholder="Masukkan keterangan atau deskripsi tambahan untuk item ini..."
          expandOnClick={true}
          readOnly={disabled}
        />
      </div>
    </div>
  );
};

export default ItemAdditionalInfoForm;
