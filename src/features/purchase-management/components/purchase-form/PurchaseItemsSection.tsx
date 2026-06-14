import React from 'react';
import FormSection from '@/components/form-section';
import ItemSearchBar from '@/components/item-search';
import Checkbox from '@/components/checkbox';
import DataGrid from '@/components/ag-grid/DataGrid';
import VatPercentageEditor from '@/features/purchase-management/components/purchase-form/VatPercentageEditor';
import type { PurchaseItem, ItemSearchBarRef, Item } from '@/types';
import type { PurchaseFormChangeEvent } from '@/features/purchase-management/hooks/purchaseForm';
import { usePurchaseItemsGrid } from './usePurchaseItemsGrid';

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
  handleChange: (event: PurchaseFormChangeEvent) => void;
}

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
  const handleVatCheckboxChange = (isChecked: boolean) => {
    handleChange({
      target: {
        name: 'is_vat_included',
        type: 'checkbox',
        checked: isChecked,
        value: String(isChecked),
      },
    });
  };

  const handleVatPercentageChange = (value: number) => {
    handleChange({
      target: {
        name: 'vat_percentage',
        value: value.toString(),
      },
    });
  };

  const { columnDefs, gridRows } = usePurchaseItemsGrid({
    getItemById,
    isVatIncluded: formData.is_vat_included,
    onHandleUnitChange,
    purchaseItems,
    removeItem,
    updateItem,
    updateItemBatchNo,
    updateItemExpiry,
    updateItemVat,
  });

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
