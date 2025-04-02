import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Item {
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

export const useItemSelection = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [searchItem, setSearchItem] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

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
        const item = items.find(item => item.id === itemId);
        if (item) {
            // Parse unit_conversions if it's a string
            if (typeof item.unit_conversions === 'string') {
                try {
                    item.unit_conversions = JSON.parse(item.unit_conversions || '[]');
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    item.unit_conversions = [];
                }
            }
            // Ensure unit_conversions is always an array
            item.unit_conversions = item.unit_conversions || [];
        }
        return item;
    };

    // Filter items based on search input
    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
        (item.code && item.code.toLowerCase().includes(searchItem.toLowerCase()))
    );

    return {
        items,
        searchItem,
        setSearchItem,
        showItemDropdown,
        setShowItemDropdown,
        selectedItem,
        setSelectedItem,
        filteredItems,
        getItemByID
    };
};