// ItemType entity definition
export interface ItemType {
  id: string;
  code?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemTypeCreateInput {
  code?: string;
  name: string;
  description?: string;
}

export interface ItemTypeUpdateInput {
  id: string;
  code?: string;
  name: string;
  description?: string;
}

// Business rules for ItemType
export const ItemTypeRules = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  requiredFields: ['name'] as const,

  validate: (data: Partial<ItemType>): string[] => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nama jenis item wajib diisi');
    } else if (data.name.length > ItemTypeRules.maxNameLength) {
      errors.push(
        `Nama jenis item maksimal ${ItemTypeRules.maxNameLength} karakter`
      );
    }

    if (
      data.description &&
      data.description.length > ItemTypeRules.maxDescriptionLength
    ) {
      errors.push(
        `Deskripsi maksimal ${ItemTypeRules.maxDescriptionLength} karakter`
      );
    }

    return errors;
  },
};
