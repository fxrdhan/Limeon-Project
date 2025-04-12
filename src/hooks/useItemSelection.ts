import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UnitConversion } from './useUnitConversion';

export interface Item {
    id: string;
    name: string;
    code?: string;
    base_price: number;
    sell_price: number;
    stock: number;
    unit_id: string;
    base_unit: string;
    unit_conversions: UnitConversion[];
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
                .select('id, name, code, base_price, sell_price, stock, unit_id, base_unit, unit_conversions')
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
            if (typeof item.unit_conversions === 'string') {
                try {
                    item.unit_conversions = JSON.parse(item.unit_conversions || '[]');
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    item.unit_conversions = [];
                }
            }
            item.unit_conversions = item.unit_conversions || [];
        }
        return item;
    };

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