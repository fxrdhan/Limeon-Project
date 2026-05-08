import React from 'react';
import FormSection from '@/components/form-section';
import Input from '@/components/input';
import { PharmaComboboxSelect } from '@/components/combobox/presets';
import { findComboboxItemByValue } from '@/components/combobox/helpers';
import Calendar from '@/components/calendar';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import type { CustomDateValueType } from '@/components/calendar/types';

interface PurchaseInfoSectionProps {
  formData: {
    invoice_number: string;
    supplier_id: string;
    date: string;
    due_date: string | null;
    payment_status: string;
    payment_method: string;
    notes: string;
  };
  suppliers: Array<{ id: string; name: string }>;
  invoiceNumberInputRef: React.RefObject<HTMLInputElement | null>;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
}

const PurchaseInfoSection: React.FC<PurchaseInfoSectionProps> = ({
  formData,
  suppliers,
  invoiceNumberInputRef,
  handleChange,
}) => {
  const handleDateChange = (
    fieldName: string,
    newDate: CustomDateValueType
  ) => {
    const fakeEvent = {
      target: {
        name: fieldName,
        value: newDate ? newDate.toISOString().split('T')[0] : '',
      },
    } as React.ChangeEvent<HTMLInputElement>;
    handleChange(fakeEvent);
  };

  const handleDropdownChange = (fieldName: string, value: string) => {
    handleChange({
      target: { name: fieldName, value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };
  const paymentStatusItems = ['unpaid', 'partial', 'paid'];
  const paymentStatusLabels = new Map([
    ['unpaid', 'Belum Dibayar'],
    ['partial', 'Sebagian'],
    ['paid', 'Lunas'],
  ]);
  const paymentMethodItems = ['cash', 'transfer', 'credit'];
  const paymentMethodLabels = new Map([
    ['cash', 'Tunai'],
    ['transfer', 'Transfer'],
    ['credit', 'Kredit'],
  ]);

  return (
    <FormSection title="Informasi Pembelian">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nomor Faktur
          </label>
          <Input
            ref={invoiceNumberInputRef}
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            placeholder="Masukkan nomor faktur"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Supplier
          </label>
          <PharmaComboboxSelect
            name="supplier_id"
            items={suppliers}
            value={findComboboxItemByValue(
              suppliers,
              formData.supplier_id,
              supplier => supplier.id
            )}
            onValueChange={supplier =>
              handleDropdownChange('supplier_id', supplier?.id ?? '')
            }
            itemToStringLabel={supplier => supplier.name}
            itemToStringValue={supplier => supplier.id}
            placeholder="-- Pilih Supplier --"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tanggal Pembelian
          </label>
          <Calendar
            value={formData.date ? new Date(formData.date) : null}
            onChange={newDate => handleDateChange('date', newDate)}
            inputClassName="w-full p-2.5 border rounded-xl text-sm"
            placeholder="Pilih tanggal pembelian"
            size="md"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tanggal Jatuh Tempo
          </label>
          <Calendar
            value={formData.due_date ? new Date(formData.due_date) : null}
            onChange={newDate => handleDateChange('due_date', newDate)}
            inputClassName="w-full p-2.5 border rounded-xl text-sm"
            minDate={formData.date ? new Date(formData.date) : undefined}
            placeholder="Pilih tanggal jatuh tempo"
            size="md"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status Pembayaran
          </label>
          <PharmaComboboxSelect
            name="payment_status"
            items={paymentStatusItems}
            value={formData.payment_status}
            onValueChange={value => {
              if (value !== null) handleDropdownChange('payment_status', value);
            }}
            itemToStringLabel={value => paymentStatusLabels.get(value) ?? value}
            itemToStringValue={value => value}
            placeholder="-- Pilih Status --"
            searchable={false}
            indicator="radio"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Metode Pembayaran
          </label>
          <PharmaComboboxSelect
            name="payment_method"
            items={paymentMethodItems}
            value={formData.payment_method}
            onValueChange={value => {
              if (value !== null) handleDropdownChange('payment_method', value);
            }}
            itemToStringLabel={value => paymentMethodLabels.get(value) ?? value}
            itemToStringValue={value => value}
            placeholder="-- Pilih Metode --"
            searchable={false}
            indicator="radio"
          />
        </div>
      </div>

      <div className="mt-4">
        <DescriptiveTextarea
          label="Catatan"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Tambahkan catatan untuk pembelian ini..."
          containerClassName="pt-0!"
          expandOnClick={true}
        />
      </div>
    </FormSection>
  );
};

export default PurchaseInfoSection;
