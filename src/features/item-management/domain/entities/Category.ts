// ItemCategory entity definition
export interface ItemCategory {
  id: string;
  code?: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemCategoryCreateInput {
  code?: string;
  name: string;
  description?: string;
}

export interface ItemCategoryUpdateInput {
  id: string;
  code?: string;
  name: string;
  description?: string;
}

// Business rules for ItemCategory
export const ItemCategoryRules = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  requiredFields: ['name'] as const,

  validate: (data: Partial<ItemCategory>): string[] => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nama kategori wajib diisi');
    } else if (data.name.length > ItemCategoryRules.maxNameLength) {
      errors.push(
        `Nama kategori maksimal ${ItemCategoryRules.maxNameLength} karakter`
      );
    }

    if (
      data.description &&
      data.description.length > ItemCategoryRules.maxDescriptionLength
    ) {
      errors.push(
        `Deskripsi maksimal ${ItemCategoryRules.maxDescriptionLength} karakter`
      );
    }

    return errors;
  },
};
