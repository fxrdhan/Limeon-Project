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

export const formatDateOnlyValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateOnlyValue = (value: string): Date => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnlyMatch) {
    throw new Error('Expected a date-only value in YYYY-MM-DD format.');
  }

  const [, yearText, monthText, dayText] = dateOnlyMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(year, month - 1, day, 12, 0, 0);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    throw new Error('Expected a valid date-only value.');
  }

  return parsedDate;
};

export const formatDateOnlyDisplayValue = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
  locale = 'id-ID'
): string => parseDateOnlyValue(value).toLocaleDateString(locale, options);

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
  } catch {
    return 'Invalid Date';
  }
};
