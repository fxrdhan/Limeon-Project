import React from 'react';
import FormSection from '@/components/form-section';
import ItemSearchBar from '@/components/item-search';
import DataGrid from '@/components/ag-grid/DataGrid';
import Button from '@/components/button';
import type { Item, ItemSearchBarRef, SaleItem } from '@/types';
import { getItemUnitOptions } from '@/lib/item-units';
import { extractNumericValue, formatRupiah } from '@/lib/formatters';
import { TbTrash } from 'react-icons/tb';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';

interface SaleItemsSectionProps {
  searchItem: string;
  onSearchItemChange: (value: string) => void;
  items: Item[];
  selectedItem: Item | null;
  onSelectItem: (value: Item | null) => void;
  saleItems: SaleItem[];
  isAddNewItemDisabled: boolean;
  onOpenAddItemPortal: () => void;
  itemSearchBarRef: React.RefObject<ItemSearchBarRef | null>;
  total: number;
  getItemById: (id: string) => Item | undefined;
  updateItem: (id: string, field: 'quantity' | 'price', value: number) => void;
  onHandleUnitChange: (id: string, unitName: string) => void;
  removeItem: (id: string) => void;
}

type SaleItemGridRow = SaleItem & {
  rowNumber: number;
  itemCode: string;
  availableStock: number;
  unitOptions: Array<{ id: string; name: string }>;
};

const SaleItemsSection: React.FC<SaleItemsSectionProps> = ({
  searchItem,
  onSearchItemChange,
  items,
  selectedItem,
  onSelectItem,
  saleItems,
  isAddNewItemDisabled,
  onOpenAddItemPortal,
  itemSearchBarRef,
  total,
  getItemById,
  updateItem,
  onHandleUnitChange,
  removeItem,
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

  const gridRows = React.useMemo<SaleItemGridRow[]>(
    () =>
      saleItems.map((item, index) => {
        const itemData = getItemById(item.item_id);
        const conversionRate = item.unit_conversion_rate || 1;
        return {
          ...item,
          rowNumber: index + 1,
          itemCode: itemData?.code || '-',
          availableStock: itemData
            ? Math.floor(itemData.stock / conversionRate)
            : 0,
          unitOptions: getUnitOptions(item.item_id),
        };
      }),
    [getItemById, getUnitOptions, saleItems]
  );

  const columnDefs = React.useMemo<ColDef<SaleItemGridRow>[]>(() => {
    const inputClassName =
      'w-full bg-transparent border-b border-slate-300 focus:border-primary focus:outline-hidden px-1 py-0.5';

    return [
      {
        field: 'rowNumber',
        headerName: 'No',
        width: 64,
        cellStyle: { textAlign: 'center' },
      },
      { field: 'itemCode', headerName: 'Kode', minWidth: 90 },
      { field: 'item_name', headerName: 'Nama', minWidth: 220, flex: 1 },
      {
        field: 'availableStock',
        headerName: 'Stok',
        minWidth: 90,
        cellStyle: { textAlign: 'right' },
        valueFormatter: params =>
          Number(params.value ?? 0).toLocaleString('id-ID'),
      },
      {
        field: 'quantity',
        headerName: 'Jml.',
        minWidth: 80,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<SaleItemGridRow>) => {
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
                if (!Number.isNaN(newValue) && newValue >= 0) {
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
        field: 'unit_name',
        headerName: 'Unit',
        minWidth: 90,
        cellStyle: { textAlign: 'center' },
        cellRenderer: (params: ICellRendererParams<SaleItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <select
              aria-label={`Unit ${item.item_name}`}
              value={item.unit_name}
              onChange={e => onHandleUnitChange(item.id, e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              className={`${inputClassName} cursor-pointer appearance-none`}
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
        headerName: 'Harga Jual',
        minWidth: 130,
        cellStyle: { textAlign: 'right' },
        cellRenderer: (params: ICellRendererParams<SaleItemGridRow>) => {
          const item = params.data;
          if (!item) return null;

          return (
            <input
              aria-label={`Harga jual ${item.item_name}`}
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
        cellRenderer: (params: ICellRendererParams<SaleItemGridRow>) => {
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
      },
    ];
  }, [onHandleUnitChange, removeItem, updateItem]);

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
        getItemPrice={item => item.sell_price}
        itemPriceLabel="Harga jual"
      />

      <DataGrid
        rowData={gridRows}
        columnDefs={columnDefs}
        disableFiltering={true}
        suppressMovableColumns={true}
        overlayNoRowsTemplate="<span style='padding: 10px; color: oklch(55.4% 0.041 257.4);'>Belum ada item ditambahkan</span>"
        domLayout="normal"
        getRowId={params => params.data?.id}
        rowClass=""
        style={{
          width: '100%',
          height: Math.min(420, Math.max(150, gridRows.length * 32 + 88)),
          marginTop: '1rem',
        }}
      />

      <div className="mt-4 flex items-center justify-end font-semibold">
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

export default SaleItemsSection;
