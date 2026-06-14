import type { BadgeVariant } from '@/types';

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

export const getPurchaseStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'unpaid':
      return 'danger';
    default:
      return 'secondary';
  }
};

export const getPurchaseStatusLabel = (status: string) => {
  switch (status) {
    case 'paid':
      return 'Lunas';
    case 'partial':
      return 'Sebagian';
    case 'unpaid':
      return 'Belum Bayar';
    default:
      return status;
  }
};

export const getPurchasePaymentMethodLabel = (method: string) => {
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

export const buildPurchaseNoRowsTemplate = (search: string) =>
  search
    ? `<span style="padding: 10px; color: ${NO_ROWS_TEXT_COLOR};">Tidak ada pembelian dengan kata kunci "${escapeOverlayText(search)}"</span>`
    : `<span style="padding: 10px; color: ${NO_ROWS_TEXT_COLOR};">Tidak ada data pembelian yang ditemukan</span>`;
