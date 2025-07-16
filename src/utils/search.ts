import type { Item } from '@/types';

export const fuzzyMatch = (text: string, pattern: string): boolean => {
    const lowerText = text?.toLowerCase?.() ?? "";
    const lowerPattern = pattern?.toLowerCase?.() ?? "";
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

export const getScore = (item: Item, searchTermLower: string): number => {
    const nameLower = item.name?.toLowerCase?.() ?? "";
    const codeLower = item.code?.toLowerCase?.() ?? "";
    const barcodeLower = item.barcode?.toLowerCase?.() ?? "";
    const categoryLower = item.category?.name?.toLowerCase?.() ?? "";
    const typeLower = item.type?.name?.toLowerCase?.() ?? "";
    const unitLower = item.unit?.name?.toLowerCase?.() ?? "";
    const basePriceLower = item.base_price?.toString?.()?.toLowerCase?.() ?? "";
    const sellPriceLower = item.sell_price?.toString?.()?.toLowerCase?.() ?? "";
    const stockLower = item.stock?.toString?.()?.toLowerCase?.() ?? "";
    
    // Higher scores for more important fields
    if (nameLower.includes(searchTermLower)) return 10;
    if (codeLower.includes(searchTermLower)) return 9;
    if (barcodeLower.includes(searchTermLower)) return 8;
    if (categoryLower.includes(searchTermLower)) return 7;
    if (typeLower.includes(searchTermLower)) return 6;
    if (unitLower.includes(searchTermLower)) return 5;
    if (basePriceLower.includes(searchTermLower)) return 4;
    if (sellPriceLower.includes(searchTermLower)) return 3;
    if (stockLower.includes(searchTermLower)) return 2;
    
    // Check unit conversions
    if (item.unit_conversions && item.unit_conversions.some(uc => 
        uc.unit?.name?.toLowerCase?.()?.includes(searchTermLower)
    )) return 1;
    
    return 0;
};

export const getSearchState = (search: string, debouncedSearch: string, dataArray: unknown[] | null | undefined): 'idle' | 'typing' | 'found' | 'not-found' => {
    if (!search) return 'idle';
    if (search && !debouncedSearch) return 'typing';
    if (debouncedSearch && dataArray && dataArray.length > 0) return 'found';
    if (debouncedSearch && dataArray && dataArray.length === 0) return 'not-found';
    return 'idle';
};
