import React from 'react';
import Input from '@/components/input';
import FormSection from '@/components/form-section';
import FormField from '@/components/form-field';
import { PriceInput, MarginEditor } from '../atoms';
import {
  basePriceSchema,
  sellPriceComparisonSchema,
} from '@/schemas/manual/itemValidation';

interface ItemPricingFormProps {
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
    <FormSection title="Harga Pokok & Jual">
      <div className="flex flex-col space-y-4">
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
            tabIndex={13}
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
            tabIndex={15}
            validationSchema={sellPriceComparisonSchema(displayBasePrice)}
            required={true}
            readOnly={disabled}
          />
        </div>
      </div>
    </FormSection>
  );
}
