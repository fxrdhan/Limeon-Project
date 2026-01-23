import {
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { AnimatePresence, motion } from 'motion/react';
import Input from '@/components/input';
import Dropdown from '@/components/dropdown';
import FormField from '@/components/form-field';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import { itemQuantitySchema } from '@/schemas/manual/itemValidation';
import type { DropdownOption } from '@/types/components';
import { createOptimizedUnitDetailFetcher } from '@/utils/optimizedCategoryDetailFetcher';

interface ItemAdditionalInfoFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: CSSProperties;
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
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
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

  const quantityDisplayValue =
    formData.quantity > 0 ? formData.quantity.toString() : '';
  useLayoutEffect(() => {
    const el = quantityInputRef.current;
    if (!el || typeof window === 'undefined') return;

    const computed = window.getComputedStyle(el);
    const font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = font;

    const text = quantityDisplayValue || '0';
    const textWidth = ctx.measureText(text).width;

    const paddingLeft = parseFloat(computed.paddingLeft) || 0;
    const paddingRight = parseFloat(computed.paddingRight) || 0;
    const borderLeft = parseFloat(computed.borderLeftWidth) || 0;
    const borderRight = parseFloat(computed.borderRightWidth) || 0;

    // Extra pixels for caret/rounding; keep minimal to avoid ugly empty space.
    const extra = 10;
    const nextWidth = Math.ceil(
      textWidth + paddingLeft + paddingRight + borderLeft + borderRight + extra
    );

    // Clamp so it doesn't get too tiny or too wide.
    const clampedWidth = Math.min(180, Math.max(42, nextWidth));
    el.style.width = `${clampedWidth}px`;

    // If the input ever had to scroll while typing, reset scrollLeft so leading
    // digits are visible.
    requestAnimationFrame(() => {
      el.scrollLeft = 0;
    });
  }, [quantityDisplayValue]);

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
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
      style={stackStyle}
    >
      <div
        className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
        onClick={() => onExpand?.()}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Info Tambahan
        </h2>
        <FaChevronDown
          size={12}
          className={`text-slate-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            key="additional-info-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
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
                  <FormField label="Nilai" className="shrink-0">
                    <Input
                      name="quantity"
                      type="number"
                      value={quantityDisplayValue}
                      tabIndex={10}
                      onChange={onChange}
                      fullWidth={false}
                      className="w-auto"
                      style={{ width: '42px' }}
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

                <FormField label="Satuan" className="flex-1">
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default ItemAdditionalInfoForm;
