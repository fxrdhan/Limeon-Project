import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../ui/Table';
import { Button } from '../ui/Button';
import { formatRupiah, extractNumericValue } from '../../lib/formatters';
import { PurchaseItem } from '../../hooks/usePurchaseForm';

interface PurchaseItemsTableProps {
    purchaseItems: PurchaseItem[];
    total: number;
    isVatIncluded: boolean;
    onUpdateItem: (id: string, field: 'quantity' | 'price' | 'discount', value: number) => void;
    onRemoveItem: (id: string) => void;
    onUpdateItemVat: (id: string, vatPercentage: number) => void;
    onUpdateItemExpiry: (id: string, expiryDate: string) => void;
    onUpdateItemBatchNo: (id: string, batchNo: string) => void;
    onUnitChange: (id: string, unitName: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getItemByID: (itemId: string) => any;
    isEmptyMessage?: string | null; // add this line
}

const PurchaseItemsTable: React.FC<PurchaseItemsTableProps> = ({
    purchaseItems,
    total,
    isVatIncluded,
    onUpdateItem,
    onRemoveItem,
    onUnitChange,
    onUpdateItemVat,
    onUpdateItemExpiry,
    onUpdateItemBatchNo,
    getItemByID,
    isEmptyMessage // add this line
}) => {
    return (
        <>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeader className="w-12 text-center">No</TableHeader>
                        <TableHeader className="w-24">Kode</TableHeader>
                        <TableHeader className="w-full">Nama</TableHeader>
                        <TableHeader className="w-28 text-center">Batch No.</TableHeader>
                        <TableHeader className="w-32 text-center">Kadaluarsa</TableHeader>
                        <TableHeader className="w-20 text-center">Jumlah</TableHeader>
                        <TableHeader className="w-24 text-center">Satuan</TableHeader>
                        <TableHeader className="w-28 text-right">Harga</TableHeader>
                        <TableHeader className="w-10 text-right">Disc</TableHeader>
                        {!isVatIncluded && <TableHeader className="w-10 text-right">VAT</TableHeader>}
                        <TableHeader className="w-28 text-right">Subtotal</TableHeader>
                        <TableHeader className="w-16 text-center">Aksi</TableHeader>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {purchaseItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={12} className="text-center text-gray-500">
                                {isEmptyMessage ?? 'Belum ada item ditambahkan'}
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
                                        onChange={(e) => onUpdateItemBatchNo(item.id, e.target.value)}
                                        className="w-28 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center"
                                        placeholder="No Batch"
                                    />
                                </TableCell>
                                <TableCell>
                                    <input
                                        type="date"
                                        value={item.expiry_date || ''}
                                        onChange={(e) => onUpdateItemExpiry(item.id, e.target.value)}
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
                                            
                                            // Izinkan input kosong untuk sementara agar user bisa mengetik ulang
                                            if (inputValue === '') {
                                                onUpdateItem(item.id, 'quantity', 0); // Gunakan 0 sementara
                                                return;
                                            }
                                            
                                            // Untuk input tidak kosong, parse dan update
                                            const newValue = parseInt(inputValue, 10);
                                            if (!isNaN(newValue) && newValue >= 0) {
                                                onUpdateItem(item.id, 'quantity', newValue);
                                            }
                                        }}
                                        onBlur={() => {
                                            // Pastikan nilai minimum 1 ketika input kehilangan fokus
                                            const numericValue = parseInt(item.quantity.toString(), 10);
                                            onUpdateItem(item.id, 'quantity', numericValue < 1 ? 1 : numericValue);
                                        }}
                                        className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center"
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <select
                                        value={item.unit}
                                        onChange={(e) => onUnitChange(item.id, e.target.value)}
                                        className="bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-center appearance-none cursor-pointer"
                                    >
                                        <option value={getItemByID(item.item_id)?.base_unit || 'Unit'}>
                                            {getItemByID(item.item_id)?.base_unit || 'Unit'}
                                        </option>
                                        {getItemByID(item.item_id)?.unit_conversions?.map((uc: { id: string; unit_name: string }) => (
                                            <option key={uc.id} value={uc.unit_name}>{uc.unit_name}</option>
                                        ))}
                                    </select>
                                </TableCell>
                                <TableCell className="text-right">
                                    <input
                                        type="text"
                                        value={item.price === 0 ? '' : formatRupiah(item.price)}
                                        onChange={(e) => {
                                            const numericValue = extractNumericValue(e.target.value);
                                            onUpdateItem(item.id, 'price', numericValue);
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
                                            // Hapus tanda % jika ada
                                            let inputValue = e.target.value;
                                            if (inputValue.endsWith('%')) {
                                                inputValue = inputValue.slice(0, -1);
                                            }
                                            
                                            // Ambil nilai numerik saja tanpa %
                                            const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
                                            onUpdateItem(item.id, 'discount', Math.min(numericValue, 100));
                                        }}
                                        className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-right"
                                        placeholder="0%"
                                        onKeyDown={(e) => {
                                            // Tangani backspace saat kursor berada di akhir input
                                            if (e.key === 'Backspace' && 
                                                item.discount > 0 && 
                                                e.currentTarget.selectionStart === e.currentTarget.value.length) {
                                                // Cegah perilaku default dan update nilai secara manual
                                                e.preventDefault();
                                                const newValue = Math.floor(item.discount / 10);
                                                onUpdateItem(item.id, 'discount', newValue);
                                            }
                                        }}
                                    />
                                </TableCell>
                                {!isVatIncluded && (
                                    <TableCell className="text-right">
                                        <input
                                            type="text"
                                            value={item.vat_percentage === 0 ? '' : `${item.vat_percentage}%`}
                                            onChange={(e) => {
                                                // Hapus tanda % jika ada
                                                let inputValue = e.target.value;
                                                if (inputValue.endsWith('%')) {
                                                    inputValue = inputValue.slice(0, -1);
                                                }
                                                
                                                // Ambil nilai numerik saja tanpa %
                                                const numericValue = parseInt(inputValue.replace(/[^\d]/g, '')) || 0;
                                                onUpdateItemVat(item.id, Math.min(numericValue, 100));
                                            }}
                                            className="w-16 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5 text-right"
                                            placeholder="0%"
                                            onKeyDown={(e) => {
                                                // Tangani backspace saat kursor berada di akhir input
                                                if (e.key === 'Backspace' && 
                                                    item.vat_percentage > 0 && 
                                                    e.currentTarget.selectionStart === e.currentTarget.value.length) {
                                                    // Cegah perilaku default dan update nilai secara manual
                                                    e.preventDefault();
                                                    const newValue = Math.floor(item.vat_percentage / 10);
                                                    onUpdateItemVat(item.id, newValue);
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
                                        onClick={() => onRemoveItem(item.id)}
                                    >
                                        <FaTrash />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            
            {/* Total display outside the table */}
            <div className="flex justify-end items-center mt-4 font-semibold text-lg">
                <div className="mr-4">Total:</div>
                <div className="w-40 text-right">
                    {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                </div>
            </div>
        </>
    );
};

export default PurchaseItemsTable;