import type { HistoryItem } from './types';

const HISTORY_FIELD_LABELS: Record<string, string> = {
  address: 'Alamat',
  base_inventory_unit: 'Unit Dasar',
  base_inventory_unit_id: 'Unit Dasar',
  base_inventory_unit_name: 'Unit Dasar',
  base_price: 'Harga Pokok',
  base_unit: 'Unit Dasar',
  base_unit_id: 'Unit Dasar',
  category_id: 'Kategori',
  code: 'Kode',
  customer_level_discounts: 'Diskon Level Pelanggan',
  description: 'Keterangan',
  dosage_id: 'Sediaan',
  has_expiry_date: 'Tanggal Kedaluwarsa',
  image_urls: 'Gambar Item',
  inventory_unit: 'Unit Inventori',
  inventory_unit_id: 'Unit Inventori',
  inventory_unit_name: 'Unit Inventori',
  is_active: 'Status Aktif',
  is_level_pricing_active: 'Harga Bertingkat',
  is_medicine: 'Status Obat',
  manufacturer_id: 'Produsen',
  measurement_denominator_unit_id: 'Satuan Penyebut Ukuran',
  measurement_denominator_value: 'Nilai Penyebut Ukuran',
  measurement_numerator_unit_id: 'Satuan Pembilang Ukuran',
  measurement_numerator_value: 'Nilai Pembilang Ukuran',
  min_stock: 'Stok Minimum',
  name: 'Nama',
  package_conversions: 'Struktur Unit Jual',
  package_id: 'Kemasan',
  quantity: 'Stok',
  sell_price: 'Harga Jual',
  type_id: 'Jenis',
  unit_id: 'Satuan',
  unit_name: 'Satuan',
};

const normalizeHistoryFieldKey = (field: string): string =>
  field
    .trim()
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .replace(/[\s-]+/gu, '_')
    .replace(/[^a-zA-Z0-9_]/gu, '')
    .toLowerCase();

const formatHistoryFieldLabel = (field: string): string => {
  const normalizedField = normalizeHistoryFieldKey(field);
  const label =
    HISTORY_FIELD_LABELS[field] ?? HISTORY_FIELD_LABELS[normalizedField];
  if (label) return label;

  return normalizedField
    .replace(/_id$/u, '')
    .replace(/_/gu, ' ')
    .replace(/\b\w/gu, letter => letter.toUpperCase());
};

export const getChangedFieldLabels = (
  changedFields: HistoryItem['changed_fields']
): string => {
  if (!changedFields) return '';

  return Object.keys(changedFields).map(formatHistoryFieldLabel).join(', ');
};
