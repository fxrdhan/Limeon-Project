import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import type { CustomDateValueType } from '@/types';

import {
    Input,
    Button,
    FormAction,
    FormSection,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Checkbox,
    TableHeader,
    DescriptiveTextarea,
    Dropdown,
    Datepicker,
} from '@/components/modules';
import ItemSearchBar from '@/components/modules/item-search';
import AddItemPortal from '@/pages/master-data/item-list/add-edit';

import { usePurchaseForm, useItemSelection } from '@/hooks';
import { extractNumericValue, formatRupiah } from '@/lib/formatters';

const CreatePurchase: React.FC = () => {
    const location = useLocation();
    const initialInvoiceNumberFromState = location.state?.initialInvoiceNumber as string | undefined;

    const navigate = useNavigate();
    const {
        formData,
        suppliers,
        purchaseItems,
        total,
        loading,
        handleChange,
        updateItem,
        handleUnitChange,
        updateItemVat,
        updateItemExpiry,
        updateItemBatchNo,
        removeItem,
        handleSubmit
    } = usePurchaseForm({ initialInvoiceNumber: initialInvoiceNumberFromState });
    const [isAddItemPortalOpen, setIsAddItemPortalOpen] = useState(false);

    const [editingVatPercentage, setEditingVatPercentage] = useState(false);
    const [vatPercentageValue, setVatPercentageValue] = useState(formData.vat_percentage.toString());
    const vatPercentageInputRef = useRef<HTMLInputElement>(null);
    const invoiceNumberInputRef = useRef<HTMLInputElement>(null);

    const {
        searchItem,
        setSearchItem,
        selectedItem,
        setSelectedItem,
        filteredItems,
        getItemByID
    } = useItemSelection();

    const isTambahItemBaruDisabled = !(searchItem.trim() !== '' && filteredItems.length === 0);

    const onHandleSubmit = (e: React.FormEvent) => {
        handleSubmit(e);
    };

    useEffect(() => {
        if (invoiceNumberInputRef.current) {
            invoiceNumberInputRef.current.focus();
        }
    }, []);

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

    return (
        <>
            <AddItemPortal
                isOpen={isAddItemPortalOpen}
                onClose={() => setIsAddItemPortalOpen(false)}
                initialSearchQuery={searchItem}
            />

        <Card>
            <CardHeader>
                <CardTitle className="text-center flex-grow">Tambah Pembelian Baru</CardTitle>
            </CardHeader>
            <form onSubmit={onHandleSubmit}>
                <CardContent className="space-y-6">
                    <FormSection title="Informasi Pembelian">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Faktur</label>
                                <Input
                                    ref={invoiceNumberInputRef}
                                    name="invoice_number"
                                    value={formData.invoice_number}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor faktur"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                <Dropdown
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={(value) => handleChange({ target: { name: 'supplier_id', value } } as React.ChangeEvent<HTMLSelectElement>)}
                                    options={suppliers.map(supplier => ({ id: supplier.id, name: supplier.name }))}
                                    placeholder="-- Pilih Supplier --"
                                >
                                </Dropdown>
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembelian</label>
                                <Datepicker
                                    value={formData.date ? new Date(formData.date) : null}
                                    onChange={(newDate: CustomDateValueType) => {
                                        const fakeEvent = { target: { name: 'date', value: newDate ? newDate.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>;
                                        handleChange(fakeEvent);
                                    }}
                                    inputClassName="w-full p-2.5 border rounded-lg text-sm"
                                    placeholder="Pilih tanggal pembelian"
                                    portalWidth="280px"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Jatuh Tempo</label>
                                <Datepicker
                                    value={formData.due_date ? new Date(formData.due_date) : null}
                                    onChange={(newDate: CustomDateValueType) => {
                                        const fakeEvent = { target: { name: 'due_date', value: newDate ? newDate.toISOString().split('T')[0] : '' } } as React.ChangeEvent<HTMLInputElement>;
                                        handleChange(fakeEvent);
                                    }}
                                    inputClassName="w-full p-2.5 border rounded-lg text-sm"
                                    minDate={formData.date ? new Date(formData.date) : undefined}
                                    placeholder="Pilih tanggal jatuh tempo"
                                    portalWidth="280px"
                                />
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status Pembayaran</label>
                                <Dropdown
                                    name="payment_status"
                                    value={formData.payment_status}
                                    onChange={(value) => handleChange({ target: { name: 'payment_status', value } } as React.ChangeEvent<HTMLSelectElement>)}
                                    options={[
                                        { id: "unpaid", name: "Belum Dibayar" },
                                        { id: "partial", name: "Sebagian" },
                                        { id: "paid", name: "Lunas" }
                                    ]}
                                    placeholder="-- Pilih Status --"
                                >
                                </Dropdown>
                            </div>

                            <div className="flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
                                <Dropdown
                                    name="payment_method"
                                    value={formData.payment_method}
                                    onChange={(value) => handleChange({ target: { name: 'payment_method', value } } as React.ChangeEvent<HTMLSelectElement>)}
                                    options={[
                                        { id: "cash", name: "Tunai" },
                                        { id: "transfer", name: "Transfer" },
                                        { id: "credit", name: "Kredit" }
                                    ]}
                                    placeholder="-- Pilih Metode --"
                                >
                                </Dropdown>
                            </div>
                        </div>

                        <div className="mt-4">
                            <DescriptiveTextarea
                                label="Catatan"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Tambahkan catatan untuk pembelian ini..."
                                containerClassName="!pt-0" 
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Daftar Item">
                        <ItemSearchBar
                            searchItem={searchItem}
                            setSearchItem={setSearchItem}
                            filteredItems={filteredItems}
                            selectedItem={selectedItem}
                            setSelectedItem={setSelectedItem}
                            isAddItemButtonDisabled={isTambahItemBaruDisabled}
                            onOpenAddItemPortal={() => setIsAddItemPortalOpen(true)}
                        />
                        <>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader className="w-[5%] text-center">No</TableHeader>
                                        <TableHeader className="w-[8%]">Kode</TableHeader>
                                        <TableHeader className="w-[27%]">Nama</TableHeader>
                                        <TableHeader className="w-[9%] text-center">Batch No.</TableHeader>
                                        <TableHeader className="w-[10%] text-center">Kadaluarsa</TableHeader>
                                        <TableHeader className="w-[5%] text-center">Jml.</TableHeader>
                                        <TableHeader className="w-[6%] text-center">Satuan</TableHeader>
                                        <TableHeader className="w-[8%] text-right">Harga</TableHeader>
                                        <TableHeader className="w-[5%] text-right">Disc</TableHeader>
                                        {!formData.is_vat_included && <TableHeader className="w-[5%] text-right">VAT</TableHeader>}
                                        <TableHeader className="w-[10%] text-right">Subtotal</TableHeader>
                                        <TableHeader className="w-[5%] text-center">Aksi</TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {purchaseItems.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={formData.is_vat_included ? 11 : 12} className="text-center text-gray-500">
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
                                                        placeholder="No. Batch"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Datepicker
                                                        value={item.expiry_date ? new Date(item.expiry_date) : null}
                                                        onChange={(newDate: CustomDateValueType) => {
                                                            updateItemExpiry(item.id, newDate ? newDate.toISOString().split('T')[0] : '');
                                                        }}
                                                        inputClassName="w-full text-center text-sm !py-[3px] !px-1 bg-transparent !border-0 border-b !border-gray-300 focus:!border-primary focus:!ring-0 !rounded-none"
                                                        placeholder="Pilih ED"
                                                        minDate={new Date()}
                                                        portalWidth="280px"
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
                                                            // if (conversions.length === 0) return <span className="text-xs">No units defined</span>;

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
                                    <Checkbox
                                        id="is_vat_included_checkbox"
                                        label="PPN Termasuk Harga"
                                        checked={formData.is_vat_included}
                                        onChange={(isChecked) => {
                                            const event = {
                                                target: { name: 'is_vat_included', type: 'checkbox', checked: isChecked, value: String(isChecked) }
                                            } as unknown as React.ChangeEvent<HTMLInputElement>;
                                            handleChange(event);
                                        }}
                                        className="text-sm"
                                    />
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
                    <FormAction
                        onCancel={() => navigate('/purchases')}
                        isSaving={loading}
                        isDisabled={purchaseItems.length === 0}
                    />
                </CardFooter>
            </form>
        </Card>    
        </>
    );
};

export default CreatePurchase;