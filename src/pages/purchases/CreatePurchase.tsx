import ItemSearchBar from './ItemSearchBar';
import { useNavigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FaTrash, FaChevronDown } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';
import { FormActions } from '../../components/ui/FormActions';
import { useItemSelection } from '../../hooks/useItemSelection';
import { extractNumericValue, formatRupiah } from '../../lib/formatters';
import Datepicker, { DateValueType } from "react-tailwindcss-datepicker";
import { FormSection, FormField } from '../../components/ui/FormComponents';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../../components/ui/Table';

const CreatePurchase: React.FC = () => {
    const navigate = useNavigate();
    const {
        formData,
        suppliers,
        purchaseItems,
        total,
        loading,
        handleChange,
        addItem,
        updateItem,
        handleUnitChange,
        updateItemVat,
        updateItemExpiry,
        updateItemBatchNo,
        removeItem,
        handleSubmit
    } = usePurchaseForm();

    const [purchaseDateValue, setPurchaseDateValue] = useState<DateValueType>({
        startDate: formData.date ? new Date(formData.date) : null,
        endDate: formData.date ? new Date(formData.date) : null
    });

    const [dueDateValue, setDueDateValue] = useState<DateValueType>({
        startDate: formData.due_date ? new Date(formData.due_date) : null,
        endDate: formData.due_date ? new Date(formData.due_date) : null
    });

    const [editingVatPercentage, setEditingVatPercentage] = useState(false);
    const [vatPercentageValue, setVatPercentageValue] = useState(formData.vat_percentage.toString());
    const vatPercentageInputRef = useRef<HTMLInputElement>(null);

    const {
        searchItem,
        setSearchItem,
        showItemDropdown,
        setShowItemDropdown,
        selectedItem,
        setSelectedItem,
        filteredItems,
        getItemByID
    } = useItemSelection();

    const onHandleSubmit = (e: React.FormEvent) => {
        handleSubmit(e);
    };

    const onHandleUnitChange = (id: string, unitName: string) => {
        handleUnitChange(id, unitName, getItemByID);
    };

    const startEditingVatPercentage = () => {
        setVatPercentageValue(formData.vat_percentage.toString());
        setEditingVatPercentage(true);
        setTimeout(() => {
            if (vatPercentageInputRef.current) {
                vatPercentageInputRef.current.focus();
                vatPercentageInputRef.current.select();
            }
        }, 10);
    };

    const stopEditingVatPercentage = () => {
        setEditingVatPercentage(false);
        
        const vatPercentage = parseFloat(vatPercentageValue);
        if (!isNaN(vatPercentage)) {
            const fakeEvent = { 
                target: { 
                    name: 'vat_percentage', 
                    value: Math.min(vatPercentage, 100).toString() 
                } 
            } as React.ChangeEvent<HTMLInputElement>;
            handleChange(fakeEvent);
        }
    };

    const handleVatPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVatPercentageValue(e.target.value);
    };

    const handleVatPercentageKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            stopEditingVatPercentage();
        }
    };

    const [showNotes, setShowNotes] = useState(false);
    const notesRef = useRef<HTMLDivElement>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center flex-grow">Tambah Pembelian Baru</CardTitle>
            </CardHeader>

            <form onSubmit={onHandleSubmit}>
                <CardContent className="space-y-6">
                    <FormSection title="Informasi Pembelian">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

                        <div className="mt-4">
                            <button 
                                type="button"
                                onClick={() => setShowNotes(!showNotes)}
                                className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                <span className="mr-2">Catatan</span>
                                <motion.div
                                    animate={{ rotate: showNotes ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="transform"
                                >
                                    <FaChevronDown size={14} />
                                </motion.div>
                            </button>
                            
                            <AnimatePresence>
                                {showNotes && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2" ref={notesRef}>
                                            <textarea
                                                name="notes"
                                                value={formData.notes}
                                                onChange={handleChange}
                                                className="w-full p-3 border rounded-md"
                                                rows={3}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </FormSection>

                    <FormSection title="Daftar Item">
                        <ItemSearchBar
                            searchItem={searchItem}
                            setSearchItem={setSearchItem}
                            showItemDropdown={showItemDropdown}
                            setShowItemDropdown={setShowItemDropdown}
                            filteredItems={filteredItems}
                            selectedItem={selectedItem}
                            setSelectedItem={setSelectedItem}
                            onAddItem={addItem}
                        />

                        <>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader className="w-[5%] text-center">No</TableHeader>
                                        <TableHeader className="w-[8%]">Kode</TableHeader>
                                        <TableHeader className="w-[25%]">Nama</TableHeader>
                                        <TableHeader className="w-[9%] text-center">Batch No.</TableHeader>
                                        <TableHeader className="w-[10%] text-center">Kadaluarsa</TableHeader>
                                        <TableHeader className="w-[5%] text-center">Jml.</TableHeader>
                                        <TableHeader className="w-[6%] text-center">Satuan</TableHeader>
                                        <TableHeader className="w-[10%] text-right">Harga</TableHeader>
                                        <TableHeader className="w-[5%] text-right">Disc</TableHeader>
                                        {!formData.is_vat_included && <TableHeader className="w-[5%] text-right">VAT</TableHeader>}
                                        <TableHeader className="w-[10%] text-right">Subtotal</TableHeader>
                                        <TableHeader className="w-[5%] text-center">Aksi</TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {purchaseItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center text-gray-500">
                                                {"Belum ada item ditambahkan"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        purchaseItems.map((item, index) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-center">{index + 1}</TableCell>
                                                <TableCell>{getItemByID(item.item_id)?.code || '-'}</TableCell>
                                                <TableCell>{item.item_name}</TableCell>
                                                <TableCell>
                                                    <input
                                                        type="text"
                                                        value={item.batch_no || ''}
                                                        onChange={(e) => updateItemBatchNo(item.id, e.target.value)}
                                                        className="w-28 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center"
                                                        placeholder="No Batch"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <input
                                                        type="date"
                                                        value={item.expiry_date || ''}
                                                        onChange={(e) => updateItemExpiry(item.id, e.target.value)}
                                                        className="w-32 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        title="Tanggal Kadaluarsa"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <input
                                                        type="number"
                                                        onFocus={(e) => e.target.select()}
                                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                                        value={item.quantity}
                                                        onChange={(e) => {
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
                                                            updateItem(item.id, 'quantity', numericValue < 1 ? 1 : numericValue);
                                                        }}
                                                        className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <select
                                                        value={item.unit}
                                                        onChange={(e) => onHandleUnitChange(item.id, e.target.value)}
                                                        className="bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center appearance-none cursor-pointer"
                                                    >
                                                        <option value={getItemByID(item.item_id)?.base_unit || 'Unit'}>
                                                            {getItemByID(item.item_id)?.base_unit || 'Unit'}
                                                        </option>
                                                        {(() => {
                                                            const conversions = getItemByID(item.item_id)?.unit_conversions;
                                                            if (!conversions) return null;
                                                            if (conversions.length === 0) return <span className="text-xs">No units defined</span>;

                                                            const uniqueUnits = Array.from(new Map(conversions.map(uc => [uc.to_unit_id, { id: uc.to_unit_id, unit_name: uc.unit_name }])).values());

                                                            return uniqueUnits.map((uc) => (
                                                                <option key={uc.id} value={uc.unit_name}>{uc.unit_name}</option>
                                                            ));
                                                        })()}
                                                    </select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <input
                                                        type="text"
                                                        value={item.price === 0 ? '' : formatRupiah(item.price)}
                                                        onChange={(e) => {
                                                            const numericValue = extractNumericValue(e.target.value);
                                                            updateItem(item.id, 'price', numericValue);
                                                        }}
                                                        className="w-28 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-right"
                                                        placeholder="Rp 0"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <input
                                                        type="text"
                                                        value={item.discount === 0 ? '' : `${item.discount}%`}
                                                        onChange={(e) => {
                                                            let inputValue = e.target.value;
                                                            if (inputValue.endsWith('%')) {
                                                                inputValue = inputValue.slice(0, -1);
                                                            }

                                                            const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
                                                            updateItem(item.id, 'discount', Math.min(numericValue, 100));
                                                        }}
                                                        className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-right"
                                                        placeholder="0%"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace' &&
                                                                item.discount > 0 &&
                                                                e.currentTarget.selectionStart === e.currentTarget.value.length) {
                                                                e.preventDefault();
                                                                const newValue = Math.floor(item.discount / 10);
                                                                updateItem(item.id, 'discount', newValue);
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                {!formData.is_vat_included && (
                                                    <TableCell className="text-right">
                                                        <input
                                                            type="text"
                                                            value={item.vat_percentage === 0 ? '' : `${item.vat_percentage}%`}
                                                            onChange={(e) => {
                                                                let inputValue = e.target.value;
                                                                if (inputValue.endsWith('%')) {
                                                                    inputValue = inputValue.slice(0, -1);
                                                                }

                                                                const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
                                                                updateItemVat(item.id, Math.min(numericValue, 100));
                                                            }}
                                                            className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-right"
                                                            placeholder="0%"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Backspace' &&
                                                                    item.vat_percentage > 0 &&
                                                                    e.currentTarget.selectionStart === e.currentTarget.value.length) {
                                                                    e.preventDefault();
                                                                    const newValue = Math.floor(item.vat_percentage / 10);
                                                                    updateItemVat(item.id, newValue);
                                                                }
                                                            }}
                                                        />
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right">
                                                    {item.subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        type="button"
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => removeItem(item.id)}
                                                    >
                                                        <FaTrash />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex justify-between items-center mt-4 font-semibold">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="is_vat_included"
                                            checked={formData.is_vat_included}
                                            onChange={handleChange}
                                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <label className="ml-2">PPN Termasuk Harga</label>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="mr-2">PPN:</label>
                                        <div className="flex items-center">
                                            {editingVatPercentage ? (
                                                <div className="flex items-center">
                                                    <input
                                                        ref={vatPercentageInputRef}
                                                        type="number"
                                                        value={vatPercentageValue}
                                                        onChange={handleVatPercentageChange}
                                                        onBlur={stopEditingVatPercentage}
                                                        onKeyDown={handleVatPercentageKeyDown}
                                                        className="w-16 p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent "
                                                        min="0"
                                                        max="100"
                                                    />
                                                    <span className="ml-1">%</span>
                                                </div>
                                            ) : (
                                                <span
                                                    className="w-10 p-1 rounded-md cursor-pointer flex items-center justify-end hover:bg-gray-100 transition-colors text-orange-500"
                                                    onClick={startEditingVatPercentage}
                                                    title="Klik untuk mengubah persentase PPN"
                                                >
                                                    {formData.vat_percentage}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center text-lg">
                                    <div className="mr-4">Total:</div>
                                    <div className="w-40 text-right">
                                        {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                    </div>
                                </div>
                            </div>
                        </>
                    </FormSection>
                </CardContent>

                <CardFooter className="flex justify-between">
                    <FormActions
                        onCancel={() => navigate('/purchases')}
                        isSaving={loading}
                        isDisabled={purchaseItems.length === 0}
                    />
                </CardFooter>
            </form>
        </Card>
    );
};

export default CreatePurchase;