import { z } from 'zod';

// Schema untuk validasi field nama item
export const itemNameSchema = z
  .string()
  .min(1, 'Nama item harus diisi')
  .refine(
    value => value.trim().length > 0,
    'Nama item tidak boleh hanya berisi spasi'
  );

// Schema untuk validasi field nama item dalam bentuk object
export const itemNameObjectSchema = z.object({
  name: itemNameSchema,
});

// Schema untuk validasi harga pokok (tidak boleh 0) - menerima string currency format
export const basePriceSchema = z.string().refine(value => {
  // Remove "Rp" prefix and any whitespace, then parse to number
  const cleanValue = value
    .replace(/^Rp\s*/, '')
    .replace(/\./g, '')
    .trim();
  const numValue = parseFloat(cleanValue);
  return !isNaN(numValue) && numValue > 0;
}, 'Harga pokok harus lebih dari 0');

// Schema untuk validasi harga jual (tidak boleh 0) - menerima string currency format
export const sellPriceSchema = z.string().refine(value => {
  // Remove "Rp" prefix and any whitespace, then parse to number
  const cleanValue = value
    .replace(/^Rp\s*/, '')
    .replace(/\./g, '')
    .trim();
  const numValue = parseFloat(cleanValue);
  return !isNaN(numValue) && numValue > 0;
}, 'Harga jual harus lebih dari 0');

// Schema untuk validasi nilai item (harus lebih dari 0)
export const itemQuantitySchema = z.string().refine(value => {
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue > 0;
}, 'Nilai harus lebih dari 0');

// Utility function untuk parse currency string ke number
const parseCurrencyString = (value: string): number => {
  const cleanValue = value
    .replace(/^Rp\s*/, '')
    .replace(/\./g, '')
    .trim();
  return parseFloat(cleanValue) || 0;
};

// Schema untuk validasi harga jual dengan perbandingan terhadap harga pokok
export const sellPriceComparisonSchema = (basePrice: string) =>
  z
    .string()
    .refine(value => {
      // Remove "Rp" prefix and any whitespace, then parse to number
      const cleanValue = value
        .replace(/^Rp\s*/, '')
        .replace(/\./g, '')
        .trim();
      const numValue = parseFloat(cleanValue);
      return !isNaN(numValue) && numValue > 0;
    }, 'Harga jual harus lebih dari 0')
    .refine(value => {
      const sellPriceNum = parseCurrencyString(value);
      const basePriceNum = parseCurrencyString(basePrice);
      return sellPriceNum > basePriceNum;
    }, 'Harga jual harus lebih tinggi dari harga pokok');

// Schema lengkap untuk item (akan digunakan nanti)
export const itemSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama item harus diisi')
    .refine(
      value => value.trim().length > 0,
      'Nama item tidak boleh hanya berisi spasi'
    ),
  category_id: z.string().min(1, 'Kategori harus dipilih'),
  type_id: z.string().min(1, 'Jenis harus dipilih'),
  unit_id: z.string().min(1, 'Kemasan harus dipilih'),
  base_price: z.number().min(0.01, 'Harga pokok harus lebih dari 0'),
  sell_price: z.number().min(0.01, 'Harga jual harus lebih dari 0'),
  // Field opsional
  manufacturer: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  rack: z.string().optional(),
  is_medicine: z.boolean().default(false),
  is_active: z.boolean().default(true),
  has_expiry_date: z.boolean().default(false),
  min_stock: z.number().min(0, 'Stok minimal tidak boleh negatif').default(0),
});

export type ItemNameValidation = z.infer<typeof itemNameSchema>;
export type BasePriceValidation = z.infer<typeof basePriceSchema>; // string (currency format)
export type SellPriceValidation = z.infer<typeof sellPriceSchema>; // string (currency format)
export type ItemValidation = z.infer<typeof itemSchema>;
