import type { SalesListItem } from './types';

const NO_ROWS_TEXT_COLOR = 'oklch(55.4% 0.041 257.4)';

const escapeOverlayText = (value: string) =>
  value.replace(/[&<>"']/g, char => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[char] ?? char;
  });

export const getSalesPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash':
      return 'Tunai';
    case 'transfer':
      return 'Transfer';
    case 'credit':
      return 'Kredit';
    default:
      return method;
  }
};

export const getSalesBuyerName = (sale: SalesListItem) =>
  sale.customer?.name || sale.patient?.name || 'Umum';

export const buildSalesNoRowsTemplate = (search: string) =>
  search
    ? `<span style="padding: 10px; color: ${NO_ROWS_TEXT_COLOR};">Tidak ada penjualan dengan kata kunci "${escapeOverlayText(search)}"</span>`
    : `<span style="padding: 10px; color: ${NO_ROWS_TEXT_COLOR};">Tidak ada data penjualan yang ditemukan</span>`;
