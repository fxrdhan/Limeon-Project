import { forwardRef, type CSSProperties } from 'react';
import { TbChevronDown } from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import Dropdown from '@/components/dropdown';
import Checkbox from '@/components/checkbox';
import FormField from '@/components/form-field';
import { MinStockEditor } from '../atoms';
import FefoTooltip from '../molecules/FefoTooltip';

interface ItemSettingsFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: CSSProperties;
  formData: {
    is_active: boolean;
    is_medicine: boolean;
    has_expiry_date: boolean;
    min_stock: number;
  };
  minStockEditing: {
    isEditing: boolean;
    value: string;
  };
  onFieldChange: (field: string, value: boolean) => void;
  onStartEditMinStock: () => void;
  onStopEditMinStock: () => void;
  onMinStockChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMinStockKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const ItemSettingsForm = forwardRef<HTMLLabelElement, ItemSettingsFormProps>(
  (
    {
      isExpanded = true,
      onExpand,
      stackClassName,
      stackStyle,
      formData,
      minStockEditing,
      onFieldChange,
      onStartEditMinStock,
      onStopEditMinStock,
      onMinStockChange,
      onMinStockKeyDown,
      disabled = false,
    },
    ref
  ) => {
    return (
      <section
        className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
        style={stackStyle}
        data-stack-card="true"
      >
        <div
          className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
          onClick={() => onExpand?.()}
          onFocus={event => {
            if (!isExpanded && event.currentTarget.matches(':focus-visible')) {
              onExpand?.();
            }
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onExpand?.();
            }
          }}
          tabIndex={17}
          role="button"
          aria-expanded={isExpanded}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Pengaturan Tambahan
          </h2>
          <TbChevronDown
            size={16}
            className={`text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>

        <AnimatePresence initial={false}>
          {isExpanded ? (
            <motion.div
              key="settings-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="p-4 md:p-5 grid grid-cols-1 gap-6">
                <FormField label="Status" required={true}>
                  <Dropdown
                    name="is_active"
                    tabIndex={18}
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={value => {
                      onFieldChange('is_active', value === 'true');
                    }}
                    options={[
                      { id: 'true', name: 'Masih dijual' },
                      { id: 'false', name: 'Tidak Dijual' },
                    ]}
                    withRadio
                    searchList={false}
                    disabled={disabled}
                  />
                </FormField>

                <MinStockEditor
                  isEditing={minStockEditing.isEditing}
                  minStockValue={minStockEditing.value}
                  currentMinStock={formData.min_stock}
                  tabIndex={19}
                  onStartEdit={onStartEditMinStock}
                  onStopEdit={onStopEditMinStock}
                  onChange={onMinStockChange}
                  onKeyDown={onMinStockKeyDown}
                  disabled={disabled}
                />

                <div
                  className={
                    formData.is_medicine ? '' : 'opacity-50 pointer-events-none'
                  }
                >
                  <Checkbox
                    id="has_expiry_date"
                    tabIndex={20}
                    ref={ref}
                    label="Memiliki Tanggal Kadaluarsa"
                    checked={formData.has_expiry_date}
                    disabled={!formData.is_medicine || disabled}
                    onChange={isChecked =>
                      onFieldChange('has_expiry_date', isChecked)
                    }
                    className="py-1"
                  />
                  <div className="mt-1 text-sm text-slate-500 flex items-center">
                    Akan digunakan metode FEFO
                    <FefoTooltip />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    );
  }
);

ItemSettingsForm.displayName = 'ItemSettingsForm';

export default ItemSettingsForm;
