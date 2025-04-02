import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../ui/Table';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
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
    getItemByID
}) => {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableHeader className="w-16 text-center">No</TableHeader>
                    <TableHeader>Kode Item</TableHeader>
                    <TableHeader>Nama Item</TableHeader>
                    <TableHeader>Batch No.</TableHeader>
                    <TableHeader>Kadaluarsa</TableHeader>
                    <TableHeader className="text-center">Jumlah</TableHeader>
                    <TableHeader className="text-center">Satuan</TableHeader>
                    <TableHeader className="text-right">Harga</TableHeader>
                    <TableHeader className="text-right">Diskon (%)</TableHeader>
                    {!isVatIncluded && <TableHeader className="text-right">VAT (%)</TableHeader>}
                    <TableHeader className="text-right">Subtotal</TableHeader>
                    <TableHeader className="text-center">Aksi</TableHeader>
                </TableRow>
            </TableHead>
            <TableBody>
                {purchaseItems.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={12} className="text-center text-gray-500">
                            Belum ada item ditambahkan
                        </TableCell>
                    </TableRow>
                ) : (
                    purchaseItems.map((item, index) => (
                        <TableRow key={item.id}>
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>{getItemByID(item.item_id)?.code || '-'}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>
                                <Input
                                    type="text"
                                    value={item.batch_no || ''}
                                    onChange={(e) => onUpdateItemBatchNo(item.id, e.target.value)}
                                    className="w-24 text-center"
                                    placeholder="No Batch"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    value={item.expiry_date || ''}
                                    onChange={(e) => onUpdateItemExpiry(item.id, e.target.value)}
                                    className="w-36 text-center"
                                    min={new Date().toISOString().split('T')[0]}
                                    title="Tanggal Kadaluarsa"
                                    placeholder="Tgl. Kadaluarsa"
                                />
                            </TableCell>
                            <TableCell className="text-center">
                                <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => onUpdateItem(item.id, 'quantity', Number(e.target.value))}
                                    className="w-20 text-center"
                                />
                            </TableCell>
                            <TableCell className="text-center">
                                <select
                                    value={item.unit}
                                    onChange={(e) => onUnitChange(item.id, e.target.value)}
                                    className="p-2 border rounded-md"
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
                                <Input
                                    type="text"
                                    value={item.price === 0 ? '' : formatRupiah(item.price)}
                                    onChange={(e) => {
                                        const numericValue = extractNumericValue(e.target.value);
                                        onUpdateItem(item.id, 'price', numericValue);
                                    }}
                                    className="w-32 text-right"
                                    placeholder="Rp 0"
                                />
                            </TableCell>
                            <TableCell className="text-right">
                                <Input
                                    type="text"
                                    value={item.discount === 0 ? '' : `${item.discount}%`}
                                    onChange={(e) => {
                                        const numericValue = extractNumericValue(e.target.value);
                                        onUpdateItem(item.id, 'discount', Math.min(numericValue, 100));
                                    }}
                                    className="w-20 text-right"
                                    placeholder="0%"
                                />
                            </TableCell>
                            {!isVatIncluded && (
                                <TableCell className="text-right">
                                    <Input
                                        type="text"
                                        value={item.vat_percentage === 0 ? '' : `${item.vat_percentage}%`}
                                        onChange={(e) => {
                                            const numericValue = extractNumericValue(e.target.value);
                                            onUpdateItemVat(item.id, Math.min(numericValue, 100));
                                        }}
                                        className="w-20 text-right"
                                        placeholder="0%"
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
                <TableRow className="font-semibold bg-gray-50">
                    <TableCell colSpan={isVatIncluded ? 9 : 10} className="text-right">Total:</TableCell>
                    <TableCell className="text-right">
                        {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                    </TableCell>
                    <TableCell children={undefined}></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
};

export default PurchaseItemsTable;