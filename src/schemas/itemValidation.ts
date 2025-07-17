import { z } from "zod";

// Schema untuk validasi field nama item
export const itemNameSchema = z
  .string()
  .min(1, "Nama item harus diisi")
  .refine(
    (value) => value.trim().length > 0,
    "Nama item tidak boleh hanya berisi spasi"
  );

// Schema untuk validasi field nama item dalam bentuk object
export const itemNameObjectSchema = z.object({
  name: itemNameSchema,
});

// Schema lengkap untuk item (akan digunakan nanti)
export const itemSchema = z.object({
  name: z
    .string()
    .min(1, "Nama item harus diisi")
    .refine(
      (value) => value.trim().length > 0,
      "Nama item tidak boleh hanya berisi spasi"
    ),
  category_id: z.string().min(1, "Kategori harus dipilih"),
  type_id: z.string().min(1, "Jenis harus dipilih"),
  unit_id: z.string().min(1, "Satuan harus dipilih"),
  base_price: z.number().min(0.01, "Harga pokok harus lebih dari 0"),
  sell_price: z.number().min(0, "Harga jual tidak boleh negatif"),
  // Field opsional
  barcode: z.string().optional(),
  description: z.string().optional(),
  rack: z.string().optional(),
  is_medicine: z.boolean().default(false),
  is_active: z.boolean().default(true),
  has_expiry_date: z.boolean().default(false),
  min_stock: z.number().min(0, "Stok minimal tidak boleh negatif").default(0),
});

export type ItemNameValidation = z.infer<typeof itemNameSchema>;
export type ItemValidation = z.infer<typeof itemSchema>;