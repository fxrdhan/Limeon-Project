import type { SalesListItem } from './types';
import { buildAgGridNoRowsOverlayTemplate } from '@/lib/agGridOverlayTemplate';

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
    ? buildAgGridNoRowsOverlayTemplate(
        `Tidak ada penjualan dengan kata kunci "${search}"`
      )
    : buildAgGridNoRowsOverlayTemplate(
        'Tidak ada data penjualan yang ditemukan'
      );
