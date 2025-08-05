// ItemPackage entity definition
export interface ItemPackage {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemPackageCreateInput {
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
}

export interface ItemPackageUpdateInput {
  id: string;
  code?: string;
  name: string;
  nci_code?: string;
  description?: string;
}

// Business rules for ItemPackage
export const ItemPackageRules = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxNciCodeLength: 20,
  requiredFields: ['name'] as const,
  
  validate: (data: Partial<ItemPackage>): string[] => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) {
      errors.push('Nama kemasan wajib diisi');
    } else if (data.name.length > ItemPackageRules.maxNameLength) {
      errors.push(`Nama kemasan maksimal ${ItemPackageRules.maxNameLength} karakter`);
    }
    
    if (data.description && data.description.length > ItemPackageRules.maxDescriptionLength) {
      errors.push(`Deskripsi maksimal ${ItemPackageRules.maxDescriptionLength} karakter`);
    }
    
    if (data.nci_code && data.nci_code.length > ItemPackageRules.maxNciCodeLength) {
      errors.push(`Kode NCI maksimal ${ItemPackageRules.maxNciCodeLength} karakter`);
    }
    
    return errors;
  }
};