import type { ProductListItem } from '@/types';
import type { ColDef } from 'ag-grid-community';

export type ConfirmInvoiceProductGridRow = ProductListItem & {
  gridId: string;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const formatConfirmInvoiceCurrency = (
  value: number | string | undefined | null,
  prefix = ''
) => {
  if (value === null || value === undefined) return '-';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) return '-';

  return `${prefix}${currencyFormatter.format(numValue)}`;
};

export const formatConfirmInvoiceProductField = (
  value: string | number | undefined | null | boolean,
  isDiscount = false
) => {
  const displayValue = value ?? '-';
  return isDiscount && displayValue !== '-'
    ? `${displayValue}%`
    : displayValue.toLocaleString();
};

export const buildConfirmInvoiceProductRows = (
  products: ProductListItem[] | null | undefined
): ConfirmInvoiceProductGridRow[] =>
  (products ?? []).map((product, index) => ({
    ...product,
    gridId: product.sku
      ? `product-${product.sku}-${index}`
      : `product-${product.product_name ?? 'unknown'}-${index}`,
  }));

export const confirmInvoiceProductColumnDefs: ColDef<ConfirmInvoiceProductGridRow>[] =
  [
    {
      field: 'sku',
      headerName: 'SKU',
      minWidth: 100,
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'product_name',
      headerName: 'Nama Produk',
      minWidth: 220,
      flex: 1,
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'quantity',
      headerName: 'Qty',
      minWidth: 80,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'unit',
      headerName: 'Satuan',
      minWidth: 90,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'batch_number',
      headerName: 'No. Batch',
      minWidth: 110,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'expiry_date',
      headerName: 'Exp',
      minWidth: 110,
      cellStyle: { textAlign: 'center' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'unit_price',
      headerName: 'Harga',
      minWidth: 110,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
    {
      field: 'discount',
      headerName: 'Disk',
      minWidth: 80,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value, true)),
    },
    {
      field: 'total_price',
      headerName: 'Total',
      minWidth: 120,
      cellStyle: { textAlign: 'right' },
      valueFormatter: params =>
        String(formatConfirmInvoiceProductField(params.value)),
    },
  ];
