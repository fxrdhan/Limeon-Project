// ItemManufacturer entity definition
export interface ItemManufacturer {
  id: string;
  code?: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface ItemManufacturerCreateInput {
  code?: string;
  name: string;
  address?: string;
}

export interface ItemManufacturerUpdateInput {
  id: string;
  code?: string;
  name: string;
  address?: string;
}

// Business rules for ItemManufacturer
export const ItemManufacturerRules = {
  maxNameLength: 100,
  maxAddressLength: 500,
  requiredFields: ['name'] as const,
  
  validate: (data: Partial<ItemManufacturer>): string[] => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) {
      errors.push('Nama produsen wajib diisi');
    } else if (data.name.length > ItemManufacturerRules.maxNameLength) {
      errors.push(`Nama produsen maksimal ${ItemManufacturerRules.maxNameLength} karakter`);
    }
    
    if (data.address && data.address.length > ItemManufacturerRules.maxAddressLength) {
      errors.push(`Alamat maksimal ${ItemManufacturerRules.maxAddressLength} karakter`);
    }
    
    return errors;
  }
};