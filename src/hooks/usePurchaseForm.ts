import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Supplier {
    id: string;
    name: string;
}

export interface PurchaseFormData {
    supplier_id: string;
    invoice_number: string;
    date: string;
    payment_status: string;
    payment_method: string;
    notes: string;
    vat_percentage: number;
    is_vat_included: boolean;
}

export interface PurchaseItem {
    id: string;
    item_id: string;
    item_name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    unit: string;
    vat_percentage: number;
    batch_no: string | null;
    expiry_date: string | null;
    unit_conversion_rate: number;
}

export const usePurchaseForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    
    // Form data
    const [formData, setFormData] = useState<PurchaseFormData>({
        supplier_id: '',
        invoice_number: '',
        date: new Date().toISOString().slice(0, 10),
        payment_status: 'unpaid',
        payment_method: 'cash',
        vat_percentage: 11.0,
        is_vat_included: true,
        notes: ''
    });
    
    // Calculate total
    const total = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    useEffect(() => {
        fetchSuppliers();
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
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const addItem = (newItem: PurchaseItem) => {
        const newItems = [...purchaseItems, {
            ...newItem,
            vat_percentage: 0,
            batch_no: null,
            expiry_date: null,
            unit: newItem.unit || 'Unit',
            unit_conversion_rate: 1
        }];
        recalculateSubtotal(newItems);
        setPurchaseItems(newItems);
    };
    
    const updateItem = (id: string, field: 'quantity' | 'price' | 'discount', value: number) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                const quantity = field === 'quantity' ? value : item.quantity;
                const price = field === 'price' ? value : item.price;
                const discount = field === 'discount' ? value : item.discount;
                
                // Hitung subtotal dengan diskon
                let subtotal = quantity * price;
                if (discount > 0) {
                    const discountAmount = subtotal * (discount / 100);
                    subtotal -= discountAmount;
                }
                
                // Tambahkan VAT jika tidak termasuk
                if (item.vat_percentage > 0 && !formData.is_vat_included) {
                    const vatAmount = subtotal * (item.vat_percentage / 100);
                    subtotal += vatAmount;
                }
                return {
                    ...item,
                    [field]: value,
                    subtotal: subtotal
                };
            }
            return item;
        });
        
        setPurchaseItems(updatedItems);
    };
    
    // Fungsi untuk memperbarui VAT per item
    const updateItemVat = (id: string, vatPercentage: number) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                // Hitung subtotal dengan diskon dan VAT baru
                let subtotal = item.quantity * item.price;
                if (item.discount > 0) {
                    const discountAmount = subtotal * (item.discount / 100);
                    subtotal -= discountAmount;
                }
                
                // Tambahkan VAT jika tidak termasuk
                if (vatPercentage > 0 && !formData.is_vat_included) {
                    const vatAmount = subtotal * (vatPercentage / 100);
                    subtotal += vatAmount;
                }
                
                return {
                    ...item,
                    vat_percentage: vatPercentage,
                    subtotal: subtotal
                };
            }
            return item;
        });
        
        setPurchaseItems(updatedItems);
    };

    // Fungsi untuk memperbarui tanggal kadaluarsa
    const updateItemExpiry = (id: string, expiryDate: string) => {
        setPurchaseItems(purchaseItems.map(item => 
            item.id === id ? {...item, expiry_date: expiryDate} : item
        ));
    };

    // Fungsi untuk memperbarui nomor batch
    const updateItemBatchNo = (id: string, batchNo: string) => {
        setPurchaseItems(purchaseItems.map(item => 
            item.id === id ? {...item, batch_no: batchNo} : item
        ));
    };

    // Fungsi untuk menghitung ulang semua subtotal
    const recalculateSubtotal = (items = purchaseItems) => {
        return items.map(item => {
            let subtotal = item.quantity * item.price;
            if (item.discount > 0) {
                const discountAmount = subtotal * (item.discount / 100);
                subtotal -= discountAmount;
            }
            
            if (item.vat_percentage > 0 && !formData.is_vat_included) {
                const vatAmount = subtotal * (item.vat_percentage / 100);
                subtotal += vatAmount;
            }
            
            return {
                ...item,
                subtotal: subtotal
            };
        });
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUnitChange = (id: string, unitName: string, getItemByID: (id: string) => any) => {
        const updatedItems = purchaseItems.map(item => {
            if (item.id === id) {
                const itemData = getItemByID(item.item_id);
                if (!itemData) return item;
                
                let price = itemData.base_price;
                let conversionRate = 1;
                
                // Jika bukan satuan dasar, cari harga berdasarkan konversi
                if (unitName !== itemData.base_unit) {
                    const unitConversion = itemData.unit_conversions?.find((uc: { unit_name: string; }) => uc.unit_name === unitName);
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
    
    // Calculate total VAT amount
    const calculateTotalVat = () => {
        return purchaseItems.reduce((total, item) => {
            if (item.vat_percentage > 0) {
                const subtotalBeforeVat = item.subtotal / (1 + item.vat_percentage / 100);
                const vatAmount = item.subtotal - subtotalBeforeVat;
                return total + vatAmount;
            }
            return total;
        }, 0);
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
                    vat_percentage: formData.vat_percentage,
                    is_vat_included: formData.is_vat_included,
                    vat_amount: calculateTotalVat(),
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
                unit: item.unit,
                vat_percentage: item.vat_percentage,
                batch_no: item.batch_no,
                expiry_date: item.expiry_date
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

    return {
        formData,
        suppliers,
        purchaseItems,
        total,
        loading,
        handleChange,
        addItem,
        updateItem,
        updateItemVat,
        updateItemExpiry,
        updateItemBatchNo,
        handleUnitChange,
        removeItem,
        handleSubmit
    };
};