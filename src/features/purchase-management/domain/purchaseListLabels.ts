import type { BadgeVariant } from '@/types';
import { buildAgGridNoRowsOverlayTemplate } from '@/lib/agGridOverlayTemplate';

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
    ? buildAgGridNoRowsOverlayTemplate(
        `Tidak ada pembelian dengan kata kunci "${search}"`
      )
    : buildAgGridNoRowsOverlayTemplate(
        'Tidak ada data pembelian yang ditemukan'
      );
