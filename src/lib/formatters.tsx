// src/lib/formatters.ts
export function formatRupiah(angka: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(angka);
}

export function formatPercentage(value: number): string {
    return `${value}%`;
}

export function extractNumericValue(value: string): number {
    const numericValue = value.replace(/[^\d]/g, '');
    return numericValue ? parseInt(numericValue) : 0;
}