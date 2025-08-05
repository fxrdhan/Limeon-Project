// ItemDosage entity definition
export interface ItemDosage {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemDosageCreateInput {
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
}

export interface ItemDosageUpdateInput {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
}

// Business rules for ItemDosage
export const ItemDosageRules = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxNciCodeLength: 20,
  requiredFields: ['name'] as const,

  validate: (data: Partial<ItemDosage>): string[] => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Nama sediaan wajib diisi');
    } else if (data.name.length > ItemDosageRules.maxNameLength) {
      errors.push(
        `Nama sediaan maksimal ${ItemDosageRules.maxNameLength} karakter`
      );
    }

    if (
      data.description &&
      data.description.length > ItemDosageRules.maxDescriptionLength
    ) {
      errors.push(
        `Deskripsi maksimal ${ItemDosageRules.maxDescriptionLength} karakter`
      );
    }

    if (
      data.nci_code &&
      data.nci_code.length > ItemDosageRules.maxNciCodeLength
    ) {
      errors.push(
        `Kode NCI maksimal ${ItemDosageRules.maxNciCodeLength} karakter`
      );
    }

    return errors;
  },
};
