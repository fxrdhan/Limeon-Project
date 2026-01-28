import React from 'react';
import FormSection from '@/components/form-section';
import ItemSearchBar from '@/features/purchase-management/components/item-search';
import Checkbox from '@/components/checkbox';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeader,
} from '@/components/table';
import PurchaseItemRow from '@/features/purchase-management/components/purchase-form/PurchaseItemRow';
import VatPercentageEditor from '@/features/purchase-management/components/purchase-form/VatPercentageEditor';
import type { PurchaseItem, ItemSearchBarRef, Item } from '@/types';

interface PurchaseItemsSectionProps {
  searchItem: string;
  setSearchItem: (value: string) => void;
  filteredItems: Item[];
  selectedItem: Item | null;
  setSelectedItem: (value: Item | null) => void;
  purchaseItems: PurchaseItem[];
  isAddNewItemDisabled: boolean;
  onOpenAddItemPortal: () => void;
  itemSearchBarRef: React.RefObject<ItemSearchBarRef | null>;
  formData: {
    is_vat_included: boolean;
    vat_percentage: number;
  };
  total: number;
  getItemByID: (id: string) => Item | undefined;
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

const PurchaseItemsSection: React.FC<PurchaseItemsSectionProps> = ({
  searchItem,
  setSearchItem,
  filteredItems,
  selectedItem,
  setSelectedItem,
  purchaseItems,
  isAddNewItemDisabled,
  onOpenAddItemPortal,
  itemSearchBarRef,
  formData,
  total,
  getItemByID,
  updateItem,
  updateItemVat,
  onHandleUnitChange,
  updateItemBatchNo,
  updateItemExpiry,
  removeItem,
  handleChange,
}) => {
  const getUnitOptions = (itemId: string) => {
    const item = getItemByID(itemId);
    if (!item) return [];

    const baseOption = {
      id: item.base_unit || 'Unit',
      name: item.base_unit || 'Unit',
    };

    const conversions = item.package_conversions;
    if (!conversions) return [baseOption];

    const uniqueUnits = Array.from(
      new Map(
        conversions.map(uc => [
          uc.to_unit_id,
          {
            id: uc.to_unit_id,
            name: uc.unit_name,
          },
        ])
      ).values()
    );

    return [baseOption, ...uniqueUnits];
  };

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

  const tableColumns = [
    { key: 'no', header: 'No', minWidth: 40, align: 'center' as const },
    { key: 'code', header: 'Kode', minWidth: 80 },
    { key: 'name', header: 'Nama', minWidth: 200 },
    { key: 'batch_no', header: 'Batch No.', minWidth: 100 },
    {
      key: 'expiry_date',
      header: 'EXP',
      minWidth: 100,
      align: 'center' as const,
    },
    { key: 'quantity', header: 'Jml.', minWidth: 60, align: 'center' as const },
    { key: 'unit', header: 'Unit', minWidth: 70, align: 'center' as const },
    { key: 'price', header: 'Harga', minWidth: 100, align: 'right' as const },
    { key: 'discount', header: 'Disc', minWidth: 80, align: 'right' as const },
    ...(formData.is_vat_included
      ? []
      : [{ key: 'vat', header: 'VAT', minWidth: 60, align: 'right' as const }]),
    {
      key: 'subtotal',
      header: 'Subtotal',
      minWidth: 120,
      align: 'right' as const,
    },
    { key: 'actions', header: '‎', minWidth: 60, align: 'center' as const },
  ];

  return (
    <FormSection title="Daftar Item">
      <ItemSearchBar
        ref={itemSearchBarRef}
        searchItem={searchItem}
        setSearchItem={setSearchItem}
        filteredItems={filteredItems}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        isAddItemButtonDisabled={isAddNewItemDisabled}
        onOpenAddItemPortal={onOpenAddItemPortal}
      />

      <Table autoSize={true} columns={tableColumns} data={purchaseItems}>
        <TableHead>
          <TableRow>
            <TableHeader className="text-center">No</TableHeader>
            <TableHeader>Kode</TableHeader>
            <TableHeader>Nama</TableHeader>
            <TableHeader>Batch No.</TableHeader>
            <TableHeader className="text-center">EXP</TableHeader>
            <TableHeader className="text-center">Jml.</TableHeader>
            <TableHeader className="text-center">Unit</TableHeader>
            <TableHeader className="text-right">Harga</TableHeader>
            <TableHeader className="text-right">Disc</TableHeader>
            {!formData.is_vat_included && (
              <TableHeader className="text-right">VAT</TableHeader>
            )}
            <TableHeader className="text-right">Subtotal</TableHeader>
            <TableHeader className="text-center">‎</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchaseItems.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={formData.is_vat_included ? 11 : 12}
                className="text-center text-slate-500"
              >
                {'Belum ada item ditambahkan'}
              </TableCell>
            </TableRow>
          ) : (
            purchaseItems.map((item, index) => (
              <PurchaseItemRow
                key={item.id}
                item={item}
                index={index}
                itemCode={getItemByID(item.item_id)?.code || '-'}
                unitOptions={getUnitOptions(item.item_id)}
                isVatIncluded={formData.is_vat_included}
                onQuantityChange={(id, value) =>
                  updateItem(id, 'quantity', value)
                }
                onPriceChange={(id, value) => updateItem(id, 'price', value)}
                onDiscountChange={(id, value) =>
                  updateItem(id, 'discount', value)
                }
                onVatChange={updateItemVat}
                onUnitChange={onHandleUnitChange}
                onBatchNoChange={updateItemBatchNo}
                onExpiryDateChange={updateItemExpiry}
                onRemove={removeItem}
              />
            ))
          )}
        </TableBody>
      </Table>

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
