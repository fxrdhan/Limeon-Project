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
import type { Customer, Doctor, Patient, SaleFormData } from '@/types';

interface SaleInfoSectionProps {
  formData: SaleFormData;
  customers: Customer[];
  patients: Patient[];
  doctors: Doctor[];
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

const SaleInfoSection: React.FC<SaleInfoSectionProps> = ({
  formData,
  customers,
  patients,
  doctors,
  handleChange,
}) => {
  const handleDateChange = (fieldName: string, newDate: CalendarDateValue) => {
    handleChange({
      target: {
        name: fieldName,
        value: newDate ? formatDateOnlyValue(newDate) : '',
      },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleDropdownChange = (fieldName: string, value: string) => {
    handleChange({
      target: { name: fieldName, value },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const paymentMethodItems = ['cash', 'transfer', 'credit'];
  const paymentMethodLabels = new Map([
    ['cash', 'Tunai'],
    ['transfer', 'Transfer'],
    ['credit', 'Kredit'],
  ]);

  return (
    <FormSection title="Informasi Penjualan">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nomor Faktur
          </label>
          <Input
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            placeholder="Masukkan nomor faktur"
          />
        </div>

        <div className="flex flex-col">
          <label
            className="mb-1 block text-sm font-medium text-slate-700"
            htmlFor="sale-date"
          >
            Tanggal Penjualan
          </label>
          <Calendar
            id="sale-date"
            name="date"
            value={formData.date ? parseDateOnlyValue(formData.date) : null}
            onChange={newDate => handleDateChange('date', newDate)}
            inputClassName="w-full p-2.5 border rounded-xl text-sm"
            placeholder="Pilih tanggal penjualan"
            size="md"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Pelanggan
          </label>
          <PharmaEntityComboboxSelect
            items={customers}
            valueId={formData.customer_id}
            onValueIdChange={value =>
              handleDropdownChange('customer_id', value)
            }
            field={{ label: 'Pelanggan', name: 'customer_id' }}
            display={{ placeholder: 'Pelanggan umum' }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Pasien
          </label>
          <PharmaEntityComboboxSelect
            items={patients}
            valueId={formData.patient_id}
            onValueIdChange={value => handleDropdownChange('patient_id', value)}
            field={{ label: 'Pasien', name: 'patient_id' }}
            display={{ placeholder: 'Tanpa pasien' }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Dokter
          </label>
          <PharmaEntityComboboxSelect
            items={doctors}
            valueId={formData.doctor_id}
            onValueIdChange={value => handleDropdownChange('doctor_id', value)}
            field={{ label: 'Dokter', name: 'doctor_id' }}
            display={{ placeholder: 'Tanpa dokter' }}
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 block text-sm font-medium text-slate-700">
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
    </FormSection>
  );
};

export default SaleInfoSection;
