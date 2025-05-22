import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/types';

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

    const fuzzyMatch = (text: string, pattern: string): boolean => {
        const lowerText = text.toLowerCase();
        const lowerPattern = pattern.toLowerCase();
        let tIdx = 0;
        let pIdx = 0;
        while (tIdx < lowerText.length && pIdx < lowerPattern.length) {
            if (lowerText[tIdx] === lowerPattern[pIdx]) {
                pIdx++;
            }
            tIdx++;
        }
        return pIdx === lowerPattern.length;
    };

    const filteredItems = items.filter(item => {
        const searchTermLower = searchItem.toLowerCase();
        return fuzzyMatch(item.name, searchTermLower) || (item.code && fuzzyMatch(item.code, searchTermLower));
    });

    return {
        items,
        searchItem,
        setSearchItem,
        showItemDropdown,
        setShowItemDropdown,
        selectedItem,
        setSelectedItem,
        filteredItems,
        getItemByID,
    };
};