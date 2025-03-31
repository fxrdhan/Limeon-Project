import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { FaPlus, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormSection, FormField } from '../../components/ui/FormComponents';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } from '../../components/ui/Table';

interface Supplier {
    id: string;
    name: string;
}

interface Item {
    id: string;
    name: string;
    base_price: number;
    stock: number;
}

interface PurchaseItem {
    id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    subtotal: number;
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
                .select('id, name, base_price, stock')
                .order('name');
                
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
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
            subtotal: selectedItem.base_price
        };
        
        setPurchaseItems([...purchaseItems, newItem]);
        setSelectedItem(null);
        setSearchItem('');
    };
    
    const updateItem = (id: string, field: 'quantity' | 'price', value: number) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                const quantity = field === 'quantity' ? value : item.quantity;
                const price = field === 'price' ? value : item.price;
                return {
                    ...item,
                    [field]: value,
                    subtotal: quantity * price
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
                medicine_id: item.item_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal
            }));
            
            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItemsData);
                
            if (itemsError) throw itemsError;
            
            // Update item stocks
            for (const item of purchaseItems) {
                await supabase
                    .from('items')
                    .update({
                        stock: supabase.rpc('increment', { x: item.quantity })
                    })
                    .eq('id', item.item_id);
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
        item.name.toLowerCase().includes(searchItem.toLowerCase())
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
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari item..."
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
                                                    <div>{item.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        Harga Dasar: {item.base_price.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-2 flex">
                                <Button
                                    type="button"
                                    onClick={addItem}
                                    disabled={!selectedItem}
                                    className="flex items-center"
                                >
                                    <FaPlus className="mr-2" />
                                    Tambah Item
                                </Button>
                            </div>
                        </div>
                        
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Nama Item</TableHeader>
                                    <TableHeader className="text-right">Harga</TableHeader>
                                    <TableHeader className="text-center">Jumlah</TableHeader>
                                    <TableHeader className="text-right">Subtotal</TableHeader>
                                    <TableHeader className="text-center">Aksi</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {purchaseItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500">
                                            Belum ada item ditambahkan
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseItems.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                                                    className="w-32 text-right"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                                    className="w-20 text-center"
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
                                    <TableCell colSpan={3} className="text-right">Total:</TableCell>
                                    <TableCell className="text-right">
                                        {total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}
                                    </TableCell>
                                    {/* <TableCell></TableCell> */}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </FormSection>
                </CardContent>
                
                <CardFooter className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/purchases')}
                    >
                        <FaTimes className="mr-2" /> Batal
                    </Button>
                    
                    <Button
                        type="submit"
                        disabled={loading || purchaseItems.length === 0}
                        isLoading={loading}
                    >
                        <FaSave className="mr-2" /> Simpan
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default CreatePurchase;