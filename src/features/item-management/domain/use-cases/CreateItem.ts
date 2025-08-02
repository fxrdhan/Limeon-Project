// Business rules for creating items

export interface CreateItemInput {
  code: string;
  name: string;
  manufacturer: string;
  barcode?: string;
  is_medicine: boolean;
  category_id: string;
  type_id: string;
  unit_id: string;
  rack?: string;
  description?: string;
  base_price: number;
  sell_price: number;
  min_stock: number;
}

export interface CreateItemOutput {
  id: string;
  success: boolean;
  error?: string;
}

// Business validation rules
export const validateCreateItemInput = (
  input: CreateItemInput
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('Nama item harus diisi');
  }

  if (!input.code?.trim()) {
    errors.push('Kode item harus diisi');
  }

  if (!input.category_id) {
    errors.push('Kategori harus dipilih');
  }

  if (!input.type_id) {
    errors.push('Tipe harus dipilih');
  }

  if (!input.unit_id) {
    errors.push('Unit harus dipilih');
  }

  if (input.base_price < 0) {
    errors.push('Harga beli tidak boleh negatif');
  }

  if (input.sell_price < 0) {
    errors.push('Harga jual tidak boleh negatif');
  }

  if (input.min_stock < 0) {
    errors.push('Stok minimum tidak boleh negatif');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
