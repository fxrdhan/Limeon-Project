import React from 'react';
import FormSection from '@/components/form-section';
import Input from '@/components/input';
import {
  PharmaComboboxSelect,
  PharmaEntityComboboxSelect,
} from '@/components/combobox';
import {
  default as Calendar,
  formatDateOnlyValue,
  parseDateOnlyValue,
  type CalendarDateValue,
} from '@/components/calendar';
import DescriptiveTextarea from '@/components/descriptive-textarea';
import type { PurchaseFormChangeEvent } from '@/features/purchase-management/domain/types';

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
  handleChange: (event: PurchaseFormChangeEvent) => void;
}

const PurchaseInfoSection: React.FC<PurchaseInfoSectionProps> = ({
  formData,
  suppliers,
  invoiceNumberInputRef,
  handleChange,
}) => {
  const handleDateChange = (fieldName: string, newDate: CalendarDateValue) => {
    handleChange({
      target: {
        name: fieldName,
        value: newDate ? formatDateOnlyValue(newDate) : '',
      },
    });
  };

  const handleDropdownChange = (fieldName: string, value: string) => {
    handleChange({
      target: { name: fieldName, value },
    });
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
          <PharmaEntityComboboxSelect
            items={suppliers}
            valueId={formData.supplier_id}
            onValueIdChange={value =>
              handleDropdownChange('supplier_id', value)
            }
            field={{ label: 'Supplier', name: 'supplier_id' }}
            display={{ placeholder: '-- Pilih Supplier --' }}
          />
        </div>

        <div className="flex flex-col">
          <label
            className="block text-sm font-medium text-slate-700 mb-1"
            htmlFor="purchase-date"
          >
            Tanggal Pembelian
          </label>
          <Calendar
            id="purchase-date"
            name="date"
            value={formData.date ? parseDateOnlyValue(formData.date) : null}
            onChange={newDate => handleDateChange('date', newDate)}
            inputClassName="w-full p-2.5 border rounded-xl text-sm"
            placeholder="Pilih tanggal pembelian"
            size="md"
          />
        </div>

        <div className="flex flex-col">
          <label
            className="block text-sm font-medium text-slate-700 mb-1"
            htmlFor="purchase-due-date"
          >
            Tanggal Jatuh Tempo
          </label>
          <Calendar
            id="purchase-due-date"
            name="due_date"
            value={
              formData.due_date ? parseDateOnlyValue(formData.due_date) : null
            }
            onChange={newDate => handleDateChange('due_date', newDate)}
            inputClassName="w-full p-2.5 border rounded-xl text-sm"
            minDate={
              formData.date ? parseDateOnlyValue(formData.date) : undefined
            }
            placeholder="Pilih tanggal jatuh tempo"
            size="md"
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status Pembayaran
          </label>
          <PharmaComboboxSelect
            items={paymentStatusItems}
            value={formData.payment_status}
            onValueChange={value => {
              if (value !== null) handleDropdownChange('payment_status', value);
            }}
            item={{
              toLabel: value => paymentStatusLabels.get(value) ?? value,
              toValue: value => value,
            }}
            field={{ label: 'Status Pembayaran', name: 'payment_status' }}
            display={{
              placeholder: '-- Pilih Status --',
              indicator: 'radio',
            }}
            search={{ enabled: false }}
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Metode Pembayaran
          </label>
          <PharmaComboboxSelect
            items={paymentMethodItems}
            value={formData.payment_method}
            onValueChange={value => {
              if (value !== null) handleDropdownChange('payment_method', value);
            }}
            item={{
              toLabel: value => paymentMethodLabels.get(value) ?? value,
              toValue: value => value,
            }}
            field={{ label: 'Metode Pembayaran', name: 'payment_method' }}
            display={{
              placeholder: '-- Pilih Metode --',
              indicator: 'radio',
            }}
            search={{ enabled: false }}
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
