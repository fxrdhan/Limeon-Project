import React from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import Button from '@/components/button';
import {
  default as Calendar,
  formatDateOnlyValue,
  parseDateOnlyValue,
  type CalendarDateValue,
} from '@/components/calendar';
import { getItemUnitOptions } from '@/lib/item-units';
import { extractNumericValue, formatRupiah } from '@/lib/formatters';
import type { Item, PurchaseItem } from '@/types';
import { TbTrash } from 'react-icons/tb';
import {
  getPercentageBackspaceValue,
  getPercentageInputValue,
} from './purchaseItemsGridInput';

type PurchaseItemUpdateField = 'quantity' | 'price' | 'discount';

interface UsePurchaseItemsGridParams {
  getItemById: (id: string) => Item | undefined;
  isVatIncluded: boolean;
  onHandleUnitChange: (id: string, unitName: string) => void;
  purchaseItems: PurchaseItem[];
  removeItem: (id: string) => void;
  updateItem: (
    id: string,
    field: PurchaseItemUpdateField,
    value: number
  ) => void;
  updateItemBatchNo: (id: string, value: string) => void;
  updateItemExpiry: (id: string, value: string) => void;
  updateItemVat: (id: string, value: number) => void;
}

export type PurchaseItemGridRow = PurchaseItem & {
  rowNumber: number;
  itemCode: string;
  unitOptions: Array<{ id: string; name: string }>;
};

export const usePurchaseItemsGrid = ({
  getItemById,
  isVatIncluded,
  onHandleUnitChange,
  purchaseItems,
  removeItem,
  updateItem,
  updateItemBatchNo,
  updateItemExpiry,
  updateItemVat,
}: UsePurchaseItemsGridParams) => {
  const getUnitOptions = React.useCallback(
    (itemId: string) => {
      const item = getItemById(itemId);
      if (!item) return [];
      return getItemUnitOptions(item).map(option => ({
        id: option.id,
        name: option.name,
      }));
    },
    [getItemById]
  );
  const todayDate = React.useMemo(
    () => parseDateOnlyValue(formatDateOnlyValue(new Date())),
    []
  );

  const handlePercentageInput = React.useCallback(
    (
      itemId: string,
      value: string,
      onChange: (id: string, value: number) => void,
      maxValue: number = 100
    ) => {
      onChange(itemId, getPercentageInputValue(value, maxValue));
    },
    []
  );

  const handleBackspaceOnPercentage = React.useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      itemId: string,
      currentValue: number,
      onChange: (id: string, value: number) => void
    ) => {
      e.stopPropagation();
      const nextValue = getPercentageBackspaceValue({
        currentValue,
        inputLength: e.currentTarget.value.length,
        key: e.key,
        selectionStart: e.currentTarget.selectionStart,
      });
      if (nextValue !== null) {
        e.preventDefault();
        onChange(itemId, nextValue);
      }
    },
    []
  );

  const gridRows = React.useMemo<PurchaseItemGridRow[]>(
    () =>
      purchaseItems.map((item, index) => ({
        ...item,
        rowNumber: index + 1,
        itemCode: getItemById(item.item_id)?.code || '-',
        unitOptions: getUnitOptions(item.item_id),
      })),
    [getItemById, getUnitOptions, purchaseItems]
  );

  const columnDefs = React.useMemo<ColDef<PurchaseItemGridRow>[]>(() => {
    const inputClassName =
      'w-full bg-transparent border-b border-slate-300 focus:border-primary focus:outline-hidden px-1 py-0.5';

    const columns: ColDef<PurchaseItemGridRow>[] = [
      {
        field: 'rowNumber',
        headerName: 'No',
        width: 64,
        cellStyle: { textAlign: 'center' },
      },
      { field: 'itemCode', headerName: 'Kode', minWidth: 90 },
      { field: 'item_name', headerName: 'Nama', minWidth: 200, flex: 1 },
      {
        field: 'batch_no',
        headerName: 'Batch No.',
        minWidth: 120,
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`Batch ${item.item_name}`}
              type="text"
              value={item.batch_no || ''}
              onChange={e => updateItemBatchNo(item.id, e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              className={`${inputClassName} !text-left`}
              placeholder="No. Batch"
            />
          );
        },
      },
      {
        field: 'expiry_date',
        headerName: 'EXP',
        minWidth: 130,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <Calendar
              id={`purchase-expiry-${item.id}`}
              name="expiry_date"
              value={
                item.expiry_date ? parseDateOnlyValue(item.expiry_date) : null
              }
              onChange={(newDate: CalendarDateValue) => {
                updateItemExpiry(
                  item.id,
                  newDate ? formatDateOnlyValue(newDate) : ''
                );
              }}
              inputClassName="w-full text-center text-sm py-[3px]! px-1! bg-transparent border-0! border-b border-slate-300! focus:border-primary! focus:ring-0! rounded-none!"
              placeholder="Pilih ED"
              minDate={todayDate}
              size="md"
            />
          );
        },
      },
      {
        field: 'quantity',
        headerName: 'Jml.',
        minWidth: 80,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`Jumlah ${item.item_name}`}
              type="number"
              onFocus={e => e.target.select()}
              onClick={e => (e.target as HTMLInputElement).select()}
              value={item.quantity}
              onChange={e => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  updateItem(item.id, 'quantity', 0);
                  return;
                }
                const newValue = parseInt(inputValue, 10);
                if (!isNaN(newValue) && newValue >= 0) {
                  updateItem(item.id, 'quantity', newValue);
                }
              }}
              onBlur={() => {
                const numericValue = parseInt(item.quantity.toString(), 10);
                updateItem(
                  item.id,
                  'quantity',
                  numericValue < 1 ? 1 : numericValue
                );
              }}
              onKeyDown={e => e.stopPropagation()}
              className={`${inputClassName} text-center`}
            />
          );
        },
      },
      {
        field: 'unit',
        headerName: 'Unit',
        minWidth: 90,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <select
              aria-label={`Unit ${item.item_name}`}
              value={item.unit}
              onChange={e => onHandleUnitChange(item.id, e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              className={`${inputClassName} appearance-none cursor-pointer`}
            >
              {item.unitOptions.map(option => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        field: 'price',
        headerName: 'Harga',
        minWidth: 120,
        cellStyle: { textAlign: 'right' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`Harga ${item.item_name}`}
              type="text"
              value={item.price === 0 ? '' : formatRupiah(item.price)}
              onChange={e => {
                const numericValue = extractNumericValue(e.target.value);
                updateItem(item.id, 'price', numericValue);
              }}
              onKeyDown={e => e.stopPropagation()}
              className={`${inputClassName} text-right`}
              placeholder="Rp 0"
            />
          );
        },
      },
      {
        field: 'discount',
        headerName: 'Disc',
        minWidth: 90,
        cellStyle: { textAlign: 'right' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`Diskon ${item.item_name}`}
              type="text"
              value={item.discount === 0 ? '' : `${item.discount}%`}
              onChange={e =>
                handlePercentageInput(item.id, e.target.value, (id, value) =>
                  updateItem(id, 'discount', value)
                )
              }
              onKeyDown={e =>
                handleBackspaceOnPercentage(
                  e,
                  item.id,
                  item.discount,
                  (id, value) => updateItem(id, 'discount', value)
                )
              }
              className={`${inputClassName} text-right`}
              placeholder="0%"
            />
          );
        },
      },
    ];

    if (!isVatIncluded) {
      columns.push({
        field: 'vat_percentage',
        headerName: 'VAT',
        minWidth: 90,
        cellStyle: { textAlign: 'right' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`VAT ${item.item_name}`}
              type="text"
              value={item.vat_percentage === 0 ? '' : `${item.vat_percentage}%`}
              onChange={e =>
                handlePercentageInput(item.id, e.target.value, updateItemVat)
              }
              onKeyDown={e =>
                handleBackspaceOnPercentage(
                  e,
                  item.id,
                  item.vat_percentage,
                  updateItemVat
                )
              }
              className={`${inputClassName} text-right`}
              placeholder="0%"
            />
          );
        },
      });
    }

    columns.push(
      {
        field: 'subtotal',
        headerName: 'Subtotal',
        minWidth: 140,
        cellStyle: { textAlign: 'right' },
        valueFormatter: params =>
          Number(params.value ?? 0).toLocaleString('id-ID', {
            style: 'currency',
            currency: 'IDR',
          }),
      },
      {
        colId: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        filter: false,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<PurchaseItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => removeItem(item.id)}
            >
              <TbTrash />
            </Button>
          );
        },
      }
    );

    return columns;
  }, [
    handleBackspaceOnPercentage,
    handlePercentageInput,
    isVatIncluded,
    onHandleUnitChange,
    removeItem,
    todayDate,
    updateItem,
    updateItemBatchNo,
    updateItemExpiry,
    updateItemVat,
  ]);

  return { columnDefs, gridRows };
};
