import { BaseService } from './base.service';
import type {
  Category,
  MedicineType,
  ItemPackage,
  Supplier,
  ItemDosage,
  ItemManufacturer,
} from '@/types/database';

// Define ItemUnit type (same structure as Unit but for item_units table)
export interface ItemUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Category Service
export class CategoryService extends BaseService<Category> {
  constructor() {
    super('item_categories');
  }

  async getActiveCategories() {
    return this.getAll({
      select: 'id, code, name, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Medicine Type Service
export class MedicineTypeService extends BaseService<MedicineType> {
  constructor() {
    super('item_types');
  }

  async getActiveTypes() {
    return this.getAll({
      select: 'id, code, name, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Item Package Service
export class ItemPackageService extends BaseService<ItemPackage> {
  constructor() {
    super('item_packages');
  }

  async getActivePackages() {
    return this.getAll({
      select: 'id, code, name, nci_code, description, created_at, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Item Unit Service (for item_units table)
export class ItemUnitService extends BaseService<ItemUnit> {
  constructor() {
    super('item_units');
  }

  async getActiveItemUnits() {
    return this.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Item Dosage Service
export class ItemDosageService extends BaseService<ItemDosage> {
  constructor() {
    super('item_dosages');
  }

  async getActiveDosages() {
    return this.getAll({
      select: 'id, code, name, nci_code, description, created_at, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Item Manufacturer Service
export class ItemManufacturerService extends BaseService<ItemManufacturer> {
  constructor() {
    super('item_manufacturers');
  }

  async getActiveManufacturers() {
    return this.getAll({
      select: 'id, code, name, address, created_at, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Supplier Service
export class SupplierService extends BaseService<Supplier> {
  constructor() {
    super('suppliers');
  }

  async getActiveSuppliers() {
    return this.getAll({
      orderBy: { column: 'name', ascending: true },
    });
  }

  async searchSuppliers(query: string) {
    return this.search(query, ['name', 'contact_person', 'email', 'phone'], {
      orderBy: { column: 'name', ascending: true },
    });
  }

  async searchCategories(query: string) {
    return this.search(query, ['code', 'name', 'description'], {
      select: 'id, code, name, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }

  async searchTypes(query: string) {
    return this.search(query, ['code', 'name', 'description'], {
      select: 'id, code, name, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }

  async searchUnits(query: string) {
    return this.search(query, ['code', 'name', 'description'], {
      select: 'id, code, name, nci_code, description, updated_at',
      orderBy: { column: 'code', ascending: true },
    });
  }
}

// Export singleton instances
export const categoryService = new CategoryService();
export const medicineTypeService = new MedicineTypeService();
export const itemPackageService = new ItemPackageService();
export const itemUnitService = new ItemUnitService();
export const itemDosageService = new ItemDosageService();
export const itemManufacturerService = new ItemManufacturerService();
export const supplierService = new SupplierService();

// Master Data Service Facade
export class MasterDataService {
  categories = categoryService;
  types = medicineTypeService;
  packages = itemPackageService;
  itemUnits = itemUnitService;
  suppliers = supplierService;

  // Bulk operations for master data
  async getAllMasterData() {
    const [categories, types, packages, suppliers] = await Promise.all([
      this.categories.getActiveCategories(),
      this.types.getActiveTypes(),
      this.packages.getActivePackages(),
      this.suppliers.getActiveSuppliers(),
    ]);

    return {
      categories: categories.data || [],
      types: types.data || [],
      packages: packages.data || [],
      suppliers: suppliers.data || [],
      errors: {
        categories: categories.error,
        types: types.error,
        packages: packages.error,
        suppliers: suppliers.error,
      },
    };
  }
}

export const masterDataService = new MasterDataService();
