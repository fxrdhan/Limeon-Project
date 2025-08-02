/* eslint-disable @typescript-eslint/no-unused-vars */
export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}

export function extractNumericValue(value: string): number {
  const numericValue = value.replace(/[^\d]/g, '');
  return numericValue ? parseInt(numericValue) : 0;
}

export const formatDateTime = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};
