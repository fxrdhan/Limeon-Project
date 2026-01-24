import React from 'react';
import { TableRow, TableCell } from '@/components/table';
import Button from '@/components/button';
import Calendar from '@/components/calendar';
import { TbTrash } from 'react-icons/tb';
import { formatRupiah, extractNumericValue } from '@/lib/formatters';
import type { PurchaseItem } from '@/types';
import type { CustomDateValueType } from '@/components/calendar/types';

interface PurchaseItemRowProps {
  item: PurchaseItem;
  index: number;
  itemCode: string;
  unitOptions: Array<{ id: string; name: string }>;
  isVatIncluded: boolean;
  onQuantityChange: (id: string, value: number) => void;
  onPriceChange: (id: string, value: number) => void;
  onDiscountChange: (id: string, value: number) => void;
  onVatChange: (id: string, value: number) => void;
  onUnitChange: (id: string, unitName: string) => void;
  onBatchNoChange: (id: string, value: string) => void;
  onExpiryDateChange: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}

const PurchaseItemRow: React.FC<PurchaseItemRowProps> = ({
  item,
  index,
  itemCode,
  unitOptions,
  isVatIncluded,
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onVatChange,
  onUnitChange,
  onBatchNoChange,
  onExpiryDateChange,
  onRemove,
}) => {
  const handlePercentageInput = (
    value: string,
    onChange: (id: string, value: number) => void,
    maxValue: number = 100
  ) => {
    let inputValue = value;
    if (inputValue.endsWith('%')) {
      inputValue = inputValue.slice(0, -1);
    }
    const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
    onChange(item.id, Math.min(numericValue, maxValue));
  };

  const handleBackspaceOnPercentage = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: number,
    onChange: (id: string, value: number) => void
  ) => {
    if (
      e.key === 'Backspace' &&
      currentValue > 0 &&
      e.currentTarget.selectionStart === e.currentTarget.value.length
    ) {
      e.preventDefault();
      onChange(item.id, Math.floor(currentValue / 10));
    }
  };

  return (
    <TableRow>
      <TableCell className="text-center">{index + 1}</TableCell>
      <TableCell>{itemCode || '-'}</TableCell>
      <TableCell>{item.item_name}</TableCell>
      <TableCell>
        <input
          type="text"
          value={item.batch_no || ''}
          onChange={e => onBatchNoChange(item.id, e.target.value)}
          className="w-20 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-left"
          placeholder="No. Batch"
        />
      </TableCell>
      <TableCell className="text-center">
        <Calendar
          value={item.expiry_date ? new Date(item.expiry_date) : null}
          onChange={(newDate: CustomDateValueType) => {
            onExpiryDateChange(
              item.id,
              newDate ? newDate.toISOString().split('T')[0] : ''
            );
          }}
          inputClassName="w-full text-center text-sm py-[3px]! px-1! bg-transparent border-0! border-b border-gray-300! focus:border-primary! focus:ring-0! rounded-none!"
          placeholder="Pilih ED"
          minDate={new Date()}
          size="md"
        />
      </TableCell>
      <TableCell className="text-center">
        <input
          type="number"
          onFocus={e => e.target.select()}
          onClick={e => (e.target as HTMLInputElement).select()}
          value={item.quantity}
          onChange={e => {
            const inputValue = e.target.value;
            if (inputValue === '') {
              onQuantityChange(item.id, 0);
              return;
            }
            const newValue = parseInt(inputValue, 10);
            if (!isNaN(newValue) && newValue >= 0) {
              onQuantityChange(item.id, newValue);
            }
          }}
          onBlur={() => {
            const numericValue = parseInt(item.quantity.toString(), 10);
            onQuantityChange(item.id, numericValue < 1 ? 1 : numericValue);
          }}
          className="w-8 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-leeft"
        />
      </TableCell>
      <TableCell className="text-center">
        <select
          value={item.unit}
          onChange={e => onUnitChange(item.id, e.target.value)}
          className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 !text-left appearance-none cursor-pointer"
        >
          {unitOptions.map(option => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell className="text-right">
        <input
          type="text"
          value={item.price === 0 ? '' : formatRupiah(item.price)}
          onChange={e => {
            const numericValue = extractNumericValue(e.target.value);
            onPriceChange(item.id, numericValue);
          }}
          className="w-20 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
          placeholder="Rp 0"
        />
      </TableCell>
      <TableCell className="text-right">
        <input
          type="text"
          value={item.discount === 0 ? '' : `${item.discount}%`}
          onChange={e =>
            handlePercentageInput(e.target.value, onDiscountChange)
          }
          className="w-12 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
          placeholder="0%"
          onKeyDown={e =>
            handleBackspaceOnPercentage(e, item.discount, onDiscountChange)
          }
        />
      </TableCell>
      {!isVatIncluded && (
        <TableCell className="text-right">
          <input
            type="text"
            value={item.vat_percentage === 0 ? '' : `${item.vat_percentage}%`}
            onChange={e => handlePercentageInput(e.target.value, onVatChange)}
            className="w-12 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-hidden px-1 py-0.5 text-right"
            placeholder="0%"
            onKeyDown={e =>
              handleBackspaceOnPercentage(e, item.vat_percentage, onVatChange)
            }
          />
        </TableCell>
      )}
      <TableCell className="text-right">
        {item.subtotal.toLocaleString('id-ID', {
          style: 'currency',
          currency: 'IDR',
        })}
      </TableCell>
      <TableCell className="text-center">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onRemove(item.id)}
        >
          <TbTrash />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default PurchaseItemRow;
