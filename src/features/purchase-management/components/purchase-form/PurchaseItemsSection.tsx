import React from 'react';
import FormSection from '@/components/form-section';
import ItemSearchBar from '@/features/purchase-management/components/item-search';
import Checkbox from '@/components/checkbox';
import DataGrid from '@/components/ag-grid/DataGrid';
import VatPercentageEditor from '@/features/purchase-management/components/purchase-form/VatPercentageEditor';
import Button from '@/components/button';
import Calendar from '@/components/calendar';
import type { PurchaseItem, ItemSearchBarRef, Item } from '@/types';
import { getItemUnitOptions } from '@/lib/item-units';
import { extractNumericValue, formatRupiah } from '@/lib/formatters';
import { TbTrash } from 'react-icons/tb';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { CustomDateValueType } from '@/components/calendar/types';

interface PurchaseItemsSectionProps {
  searchItem: string;
  onSearchItemChange: (value: string) => void;
  items: Item[];
  selectedItem: Item | null;
  onSelectItem: (value: Item | null) => void;
  purchaseItems: PurchaseItem[];
  isAddNewItemDisabled: boolean;
  onOpenAddItemPortal: () => void;
  itemSearchBarRef: React.RefObject<ItemSearchBarRef | null>;
  formData: {
    is_vat_included: boolean;
    vat_percentage: number;
  };
  total: number;
  getItemById: (id: string) => Item | undefined;
  updateItem: (
    id: string,
    field: 'quantity' | 'price' | 'discount',
    value: number
  ) => void;
  updateItemVat: (id: string, value: number) => void;
  onHandleUnitChange: (id: string, unitName: string) => void;
  updateItemBatchNo: (id: string, value: string) => void;
  updateItemExpiry: (id: string, value: string) => void;
  removeItem: (id: string) => void;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
}

type PurchaseItemGridRow = PurchaseItem & {
  rowNumber: number;
  itemCode: string;
  unitOptions: Array<{ id: string; name: string }>;
};

const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = ({
  searchItem,
  onSearchItemChange,
  items,
  selectedItem,
  onSelectItem,
  purchaseItems,
  isAddNewItemDisabled,
  onOpenAddItemPortal,
  itemSearchBarRef,
  formData,
  total,
  getItemById,
  updateItem,
  updateItemVat,
  onHandleUnitChange,
  updateItemBatchNo,
  updateItemExpiry,
  removeItem,
  handleChange,
}) => {
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

  const handleVatCheckboxChange = (isChecked: boolean) => {
    const event = {
      target: {
        name: 'is_vat_included',
        type: 'checkbox',
        checked: isChecked,
        value: String(isChecked),
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleChange(event);
  };

  const handleVatPercentageChange = (value: number) => {
    const fakeEvent = {
      target: {
        name: 'vat_percentage',
        value: value.toString(),
      },
    } as React.ChangeEvent<HTMLInputElement>;
    handleChange(fakeEvent);
  };

  const handlePercentageInput = React.useCallback(
    (
      itemId: string,
      value: string,
      onChange: (id: string, value: number) => void,
      maxValue: number = 100
    ) => {
      let inputValue = value;
      if (inputValue.endsWith('%')) {
        inputValue = inputValue.slice(0, -1);
      }
      const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
      onChange(itemId, Math.min(numericValue, maxValue));
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
      if (
        e.key === 'Backspace' &&
        currentValue > 0 &&
        e.currentTarget.selectionStart === e.currentTarget.value.length
      ) {
        e.preventDefault();
        onChange(itemId, Math.floor(currentValue / 10));
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
              value={item.expiry_date ? new Date(item.expiry_date) : null}
              onChange={(newDate: CustomDateValueType) => {
                updateItemExpiry(
                  item.id,
                  newDate ? newDate.toISOString().split('T')[0] : ''
                );
              }}
              inputClassName="w-full text-center text-sm py-[3px]! px-1! bg-transparent border-0! border-b border-slate-300! focus:border-primary! focus:ring-0! rounded-none!"
              placeholder="Pilih ED"
              minDate={new Date()}
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

    if (!formData.is_vat_included) {
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
    formData.is_vat_included,
    handleBackspaceOnPercentage,
    handlePercentageInput,
    onHandleUnitChange,
    removeItem,
    updateItem,
    updateItemBatchNo,
    updateItemExpiry,
    updateItemVat,
  ]);

  return (
    <FormSection title="Daftar Item">
      <ItemSearchBar
        ref={itemSearchBarRef}
        searchItem={searchItem}
        onSearchItemChange={onSearchItemChange}
        items={items}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem}
        isAddItemButtonDisabled={isAddNewItemDisabled}
        onOpenAddItemPortal={onOpenAddItemPortal}
      />

      <DataGrid
        rowData={gridRows}
        columnDefs={columnDefs}
        disableFiltering={true}
        suppressMovableColumns={true}
        overlayNoRowsTemplate="<span style='padding: 10px; color: #64748b;'>Belum ada item ditambahkan</span>"
        domLayout="normal"
        getRowId={params => params.data?.id}
        rowClass=""
        style={{
          width: '100%',
          height: Math.min(420, Math.max(150, gridRows.length * 32 + 88)),
          marginTop: '1rem',
        }}
      />

      <div className="flex justify-between items-center mt-4 font-semibold">
        <div className="flex items-center gap-6">
          <Checkbox
            id="is_vat_included_checkbox"
            label="PPN Termasuk Harga"
            checked={formData.is_vat_included}
            onChange={handleVatCheckboxChange}
            className="text-sm"
          />
          <VatPercentageEditor
            vatPercentage={formData.vat_percentage}
            onVatPercentageChange={handleVatPercentageChange}
          />
        </div>
        <div className="flex items-center text-lg">
          <div className="mr-4">Total:</div>
          <div className="w-40 text-right">
            {total.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
            })}
          </div>
        </div>
      </div>
    </FormSection>
  );
};

export default PurchaseItemsSection;
