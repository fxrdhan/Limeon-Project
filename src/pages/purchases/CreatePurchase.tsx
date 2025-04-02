import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FormActions } from '../../components/ui/FormActions';
import { Input } from '../../components/ui/Input';
import { FormSection, FormField } from '../../components/ui/FormComponents';
import { formatRupiah, extractNumericValue } from '../../lib/formatters';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../../components/ui/Table';

interface Supplier {
    id: string;
    name: string;
}

interface Item {
    id: string;
    name: string;
    code?: string;
    base_price: number;
    stock: number;
    unit_id: string;
    base_unit: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unit_conversions: any[];
}

interface PurchaseItem {
    id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    unit: string;
    unit_conversion_rate: number;
}

const CreatePurchase = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [searchItem, setSearchItem] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    
    // Form data
    const [formData, setFormData] = useState({
        supplier_id: '',
        invoice_number: '',
        date: new Date().toISOString().slice(0, 10),
        payment_status: 'unpaid',
        payment_method: 'cash',
        notes: ''
    });
    
    // Calculate total
    const total = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    useEffect(() => {
        fetchSuppliers();
        fetchItems();
    }, []);
    
    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name')
                .order('name');
                
            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error('Error fetching suppliers:', error);
        }
    };
    
    const fetchItems = async () => {
        try {
            const { data, error } = await supabase
                .from('items')
                .select('id, name, code, base_price, stock, unit_id, base_unit, unit_conversions')
                .order('name');
                
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };
    
    const getItemByID = (itemId: string): Item | undefined => {
        return items.find(item => item.id === itemId);
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    const addItem = () => {
        if (!selectedItem) return;
        
        const newItem: PurchaseItem = {
            id: Date.now().toString(),
            item_id: selectedItem.id,
            item_name: selectedItem.name,
            quantity: 1,
            price: selectedItem.base_price,
            discount: 0,
            subtotal: selectedItem.base_price,
            unit: selectedItem.base_unit || 'Unit',
            unit_conversion_rate: 1
        };
        
        setPurchaseItems([...purchaseItems, newItem]);
        setSelectedItem(null);
        setSearchItem('');
    };
    
    const updateItem = (id: string, field: 'quantity' | 'price' | 'discount', value: number) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                const quantity = field === 'quantity' ? value : item.quantity;
                const price = field === 'price' ? value : item.price;
                const discount = field === 'discount' ? value : item.discount;
                // Hitung subtotal dengan memperhitungkan diskon dalam persentase
                const discountAmount = price * quantity * (discount / 100);
                return {
                    ...item,
                    [field]: value,
                    subtotal: quantity * price - discountAmount
                };
            }
            return item;
        });
        
        setPurchaseItems(updatedItems);
    };
    
    const handleUnitChange = (id: string, unitName: string) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                const itemData = getItemByID(item.item_id);
                if (!itemData) return item;
                
                let price = itemData.base_price;
                let conversionRate = 1;
                
                // Jika bukan satuan dasar, cari harga berdasarkan konversi
                if (unitName !== itemData.base_unit) {
                    const unitConversion = itemData.unit_conversions?.find(uc => uc.unit_name === unitName);
                    if (unitConversion) {
                        price = unitConversion.base_price || itemData.base_price / unitConversion.conversion_rate;
                        conversionRate = unitConversion.conversion_rate;
                    }
                }

                const discountAmount = price * item.quantity * (item.discount / 100);
                
                return {
                    ...item,
                    unit: unitName,
                    price: price,
                    subtotal: price * item.quantity - discountAmount,
                    unit_conversion_rate: conversionRate
                };
            }
            return item;
        });
        
        setPurchaseItems(updatedItems);
    };
    
    const removeItem = (id: string) => {
        setPurchaseItems(purchaseItems.filter(item => item.id !== id));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (purchaseItems.length === 0) {
            alert('Silakan tambahkan minimal satu item');
            return;
        }
        
        try {
            setLoading(true);
            
            // Insert purchase record
            const { data: purchaseData, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    supplier_id: formData.supplier_id || null,
                    invoice_number: formData.invoice_number,
                    date: formData.date,
                    total: total,
                    payment_status: formData.payment_status,
                    payment_method: formData.payment_method,
                    notes: formData.notes || null
                })
                .select('id')
                .single();
                
            if (purchaseError) throw purchaseError;
            
            // Insert purchase items
            const purchaseItemsData = purchaseItems.map(item => ({
                purchase_id: purchaseData.id,
                item_id: item.item_id,
                quantity: item.quantity,
                discount: item.discount,
                price: item.price,
                subtotal: item.subtotal,
                unit: item.unit
            }));
            
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItemsData);
                
            if (itemsError) throw itemsError;
            
            // Update item stocks
            for (const item of purchaseItems) {
                // Ambil data item untuk mendapatkan satuan dasar, stok saat ini, dan konversi
                const { data: itemData } = await supabase
                    .from('items')
                    .select('stock, base_unit, unit_conversions')
                    .eq('id', item.item_id)
                    .single();
                
                if (itemData) {
                    let quantityInBaseUnit = item.quantity;
                    
                    // Jika satuan pembelian berbeda dengan satuan dasar, konversikan
                    if (item.unit !== itemData.base_unit) {
                        const unitConversion = itemData.unit_conversions.find(
                            (uc: { unit_name: string; }) => uc.unit_name === item.unit
                        );
                        
                        if (unitConversion) {
                            // Konversikan ke satuan dasar
                            quantityInBaseUnit = item.quantity / unitConversion.conversion_rate;
                        }
                    }
                    
                    // Hitung stok baru dan update
                    const newStock = (itemData.stock || 0) + quantityInBaseUnit;
                    await supabase
                        .from('items').update({ stock: newStock }).eq('id', item.item_id);
                }
            }
            
            navigate('/purchases');
        } catch (error) {
            console.error('Error creating purchase:', error);
            alert('Gagal menyimpan pembelian. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };
    
    // Filter items based on search input
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
        (item.code && item.code.toLowerCase().includes(searchItem.toLowerCase()))
    );
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tambah Pembelian Baru</CardTitle>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <FormSection title="Informasi Pembelian">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField label="Tanggal Pembelian">
                                <Input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
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
                    
                    <FormSection title="Daftar Item">
                        <div className="mb-4">
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Cari nama atau kode item..."
                                        className="w-full p-3 border rounded-md"
                                        value={searchItem}
                                        onChange={(e) => {
                                            setSearchItem(e.target.value);
                                            setShowItemDropdown(true);
                                        }}
                                        onFocus={() => setShowItemDropdown(true)}
                                    />
                                    
                                    {showItemDropdown && searchItem && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                            {filteredItems.length === 0 ? (
                                                <div className="p-3 text-gray-500">Tidak ada item yang ditemukan</div>
                                            ) : (
                                                filteredItems.map(item => (
                                                    <div
                                                        key={item.id}
                                                        className="p-3 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedItem(item);
                                                            setSearchItem(item.name);
                                                            setShowItemDropdown(false);
                                                        }}
                                                    >
                                                        <div><span className="font-semibold">{item.code}</span> - {item.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            Harga Dasar: {item.base_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    onClick={addItem}
                                    disabled={!selectedItem}
                                    className="flex items-center whitespace-nowrap"
                                >
                                    <FaPlus className="mr-2" />
                                    Tambah Item
                                </Button>
                            </div>
                        </div>
                        
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-16 text-center">No</TableHeader>
                                    <TableHeader>Kode Item</TableHeader>
                                    <TableHeader>Nama Item</TableHeader>
                                    <TableHeader className="text-center">Jumlah</TableHeader>
                                    <TableHeader className="text-center">Satuan</TableHeader>
                                    <TableHeader className="text-right">Harga</TableHeader>
                                    <TableHeader className="text-right">Diskon (%)</TableHeader>
                                    <TableHeader className="text-right">Subtotal</TableHeader>
                                    <TableHeader className="text-center">Aksi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchaseItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center text-gray-500">
                                            Belum ada item ditambahkan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseItems.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-center">{index + 1}</TableCell>
                                            <TableCell>{getItemByID(item.item_id)?.code || '-'}</TableCell>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                    className="w-20 text-center"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <select
                                                    value={item.unit}
                                                    onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                                    className="p-2 border rounded-md"
                                                >
                                                    <option value={getItemByID(item.item_id)?.base_unit || 'Unit'}>
                                                        {getItemByID(item.item_id)?.base_unit || 'Unit'}
                                                    </option>
                                                    {getItemByID(item.item_id)?.unit_conversions?.map(uc => (
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
                                                        updateItem(item.id, 'price', numericValue);
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
                                                        updateItem(item.id, 'discount', Math.min(numericValue, 100));
                                                    }}
                                                    className="w-20 text-right"
                                                    placeholder="0%"
                                                />
                                            </TableCell>
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
                                <TableRow className="font-semibold bg-gray-50">
                                    <TableCell colSpan={6} className="text-right">Total:</TableCell>
                                    <TableCell className="text-right">
                                        {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                    </TableCell>
                                    <TableCell children={undefined}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
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