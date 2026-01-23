import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { AnimatePresence, motion } from 'motion/react';
import Input from '@/components/input';
import FormField from '@/components/form-field';
import { PriceInput, MarginEditor } from '../atoms';
import {
  basePriceSchema,
  sellPriceComparisonSchema,
} from '@/schemas/manual/itemValidation';

interface ItemPricingFormProps {
  isExpanded?: boolean;
  onExpand?: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  formData: {
    base_price: number;
    sell_price: number;
  };
  displayBasePrice: string;
  displaySellPrice: string;
  baseUnit: string;
  marginEditing: {
    isEditing: boolean;
    percentage: string;
  };
  calculatedMargin: number | null;
  onBasePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSellPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginChange: (percentage: string) => void;
  onStartEditMargin: () => void;
  onStopEditMargin: () => void;
  onMarginInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMarginKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export default function ItemPricingForm({
  isExpanded = true,
  onExpand,
  stackClassName,
  stackStyle,
  formData,
  displayBasePrice,
  displaySellPrice,
  baseUnit,
  marginEditing,
  calculatedMargin,
  onBasePriceChange,
  onSellPriceChange,
  onMarginChange,
  onStartEditMargin,
  onStopEditMargin,
  onMarginInputChange,
  onMarginKeyDown,
  disabled = false,
}: ItemPricingFormProps) {
  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBasePriceChange(e);
    setTimeout(() => {
      if (formData.base_price > 0 && calculatedMargin !== null) {
        onMarginChange(calculatedMargin.toFixed(1));
      }
    }, 0);
  };

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${stackClassName || ''}`}
      style={stackStyle}
    >
      <div
        className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none"
        onClick={() => onExpand?.()}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Harga Pokok & Jual
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
            key="pricing-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="p-4 md:p-5 flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Kemasan Dasar">
                  <Input
                    type="text"
                    value={baseUnit}
                    readOnly={true}
                    className="w-full"
                  />
                </FormField>

                <PriceInput
                  label="Harga Pokok"
                  name="base_price"
                  value={displayBasePrice}
                  onChange={handleBasePriceChange}
                  tabIndex={12}
                  validationSchema={basePriceSchema}
                  required={true}
                  readOnly={disabled}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 focus:outline-hidden">
                <MarginEditor
                  isEditing={marginEditing.isEditing}
                  marginPercentage={marginEditing.percentage}
                  calculatedMargin={calculatedMargin}
                  tabIndex={13}
                  onStartEdit={onStartEditMargin}
                  onStopEdit={onStopEditMargin}
                  onChange={onMarginInputChange}
                  onKeyDown={onMarginKeyDown}
                  disabled={disabled}
                />

                <PriceInput
                  label="Harga Jual"
                  name="sell_price"
                  value={displaySellPrice}
                  onChange={onSellPriceChange}
                  tabIndex={14}
                  validationSchema={sellPriceComparisonSchema(displayBasePrice)}
                  required={true}
                  readOnly={disabled}
                />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
