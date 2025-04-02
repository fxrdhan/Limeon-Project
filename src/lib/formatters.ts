/**
 * Format a number as Indonesian Rupiah
 * @param value - The number to format
 * @returns Formatted currency string
 */
export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Extract numeric value from a string (e.g., from formatted currency)
 * @param value - The string to extract from
 * @returns The extracted number
 */
export const extractNumericValue = (value: string): number => {
  const numericValue = value.replace(/[^\d]/g, '');
  return numericValue ? parseInt(numericValue) : 0;
};
