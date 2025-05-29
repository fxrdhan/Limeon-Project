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

    if (nameLower.includes(searchTermLower)) return 3;
    if (codeLower.includes(searchTermLower)) return 2;
    if (barcodeLower.includes(searchTermLower)) return 1;
    return 0;
};
