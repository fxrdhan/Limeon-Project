import React from 'react';
import { FaPlus } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';
import type { PurchaseItem, ItemSearchBarProps } from '../../types';

const ItemSearchBar: React.FC<ItemSearchBarProps> = ({
    searchItem,
    setSearchItem,
    showItemDropdown,
    setShowItemDropdown,
    filteredItems,
    selectedItem,
    setSelectedItem,
    onAddItem
}) => {
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
            unit_conversion_rate: 1,
            vat_percentage: 0,
            batch_no: null,
            expiry_date: null,
            item: {
                name: '',
                code: ''
            }
        };
        
        onAddItem(newItem);
        setSelectedItem(null);
        setSearchItem('');
    };

    return (
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
    );
};

export default ItemSearchBar;