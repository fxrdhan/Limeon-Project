import React, { useState } from 'react';
import { FormSection, FormField } from '../ui/FormComponents';
import { Input } from '../ui/Input';
import { PurchaseFormData } from '../../hooks/usePurchaseForm';
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";

interface PurchaseInformationFormProps {
    formData: PurchaseFormData;
    suppliers: Array<{ id: string; name: string }>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const PurchaseInformationForm: React.FC<PurchaseInformationFormProps> = ({
    formData,
    suppliers,
    handleChange
}) => {
    const [purchaseDateValue, setPurchaseDateValue] = useState<DateValueType>({
        startDate: formData.date ? new Date(formData.date) : null,
        endDate: formData.date ? new Date(formData.date) : null
    });

    const [dueDateValue, setDueDateValue] = useState<DateValueType>({
        startDate: formData.due_date ? new Date(formData.due_date) : null,
        endDate: formData.due_date ? new Date(formData.due_date) : null
    });

    return (
        <FormSection title="Informasi Pembelian">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Supplier">
                    <select
                        name="supplier_id"
                        value={formData.supplier_id}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-md"
                    >
                        <option value="">-- Pilih Supplier --</option>
                        {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                            </option>
                        ))}
                    </select>
                </FormField>
                
                <FormField label="Nomor Faktur">
                    <Input
                        name="invoice_number"
                        value={formData.invoice_number}
                        onChange={handleChange}
                        placeholder="Masukkan nomor faktur"
                    />
                </FormField>
                
                <FormField label="Tanggal Pembelian">
                    <Datepicker
                        primaryColor={"blue"}
                        useRange={false} 
                        asSingle={true} 
                        value={purchaseDateValue}
                        onChange={(newValue) => {
                            setPurchaseDateValue(newValue);
                            const fakeEvent = { target: { name: 'date', value: newValue?.startDate ? new Date(newValue.startDate).toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>;
                            handleChange(fakeEvent);
                        }} 
                        inputClassName="w-full p-3 border rounded-md"
                    />
                </FormField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <FormField label="Tanggal Jatuh Tempo">
                    <Datepicker
                        useRange={false} 
                        asSingle={true} 
                        value={dueDateValue}
                        onChange={(newValue) => {
                            setDueDateValue(newValue);
                            const fakeEvent = { target: { name: 'due_date', value: newValue?.startDate ? new Date(newValue.startDate).toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>;
                            handleChange(fakeEvent);
                        }} 
                        inputClassName="w-full p-3 border rounded-md"
                        minDate={formData.date ? new Date(formData.date) : undefined}
                    />
                </FormField>

                <FormField label="PPN Termasuk Harga">
                    <div className="flex items-center h-full pt-2">
                        <input
                            type="checkbox"
                            name="is_vat_included"
                            checked={formData.is_vat_included}
                            onChange={handleChange}
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                    </div>
                </FormField>
                
                <FormField label="Persentase PPN">
                    <div className="flex items-center">
                        <Input
                            type="number"
                            name="vat_percentage"
                            value={formData.vat_percentage}
                            onChange={handleChange}
                            min="0"
                            max="100"
                            className="w-16"
                        />
                        <span className="ml-1">%</span>
                    </div>
                </FormField>
                
                <FormField label="Status Pembayaran">
                    <select
                        name="payment_status"
                        value={formData.payment_status}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-md"
                    >
                        <option value="unpaid">Belum Dibayar</option>
                        <option value="partial">Sebagian</option>
                        <option value="paid">Lunas</option>
                    </select>
                </FormField>
                
                <FormField label="Metode Pembayaran">
                    <select
                        name="payment_method"
                        value={formData.payment_method}
                        onChange={handleChange}
                        className="w-full p-3 border rounded-md"
                    >
                        <option value="cash">Tunai</option>
                        <option value="transfer">Transfer</option>
                        <option value="credit">Kredit</option>
                    </select>
                </FormField>
            </div>
            
            <FormField label="Catatan">
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full p-3 border rounded-md"
                    rows={3}
                />
            </FormField>
        </FormSection>
    );
};

export default PurchaseInformationForm;