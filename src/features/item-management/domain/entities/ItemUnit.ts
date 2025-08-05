// ItemUnit entity definition
export interface ItemUnit {
  id: string; // UUID primary key (consistent with other item_* tables)
  code: string; // Database uses 'code' not 'kode'
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemUnitCreateInput {
  id?: string; // Optional UUID, will be generated if not provided
  code?: string;
  name: string;
  description?: string;
}

export interface ItemUnitUpdateInput {
  id: string; // UUID required for updates
  code?: string;
  name: string;
  description?: string;
}

// Business rules for ItemUnit
export const ItemUnitRules = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  requiredFields: ['name'] as const,

  validate: (data: Partial<ItemUnit>): string[] => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nama satuan wajib diisi');
    } else if (data.name.length > ItemUnitRules.maxNameLength) {
      errors.push(
        `Nama satuan maksimal ${ItemUnitRules.maxNameLength} karakter`
      );
    }

    if (
      data.description &&
      data.description.length > ItemUnitRules.maxDescriptionLength
    ) {
      errors.push(
        `Deskripsi maksimal ${ItemUnitRules.maxDescriptionLength} karakter`
      );
    }

    return errors;
  },
};
