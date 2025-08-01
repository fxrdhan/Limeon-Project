import { BaseService } from './base.service';
import type { Category, MedicineType, Unit, Supplier } from '@/types/database';

// Category Service
export class CategoryService extends BaseService<Category> {
  constructor() {
    super('item_categories');
  }

  async getActiveCategories() {
    return this.getAll({
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
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
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
    });
  }
}

// Unit Service
export class UnitService extends BaseService<Unit> {
  constructor() {
    super('item_units');
  }

  async getActiveUnits() {
    return this.getAll({
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
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
      orderBy: { column: 'name', ascending: true }
    });
  }

  async searchSuppliers(query: string) {
    return this.search(query, ['name', 'contact_person', 'email', 'phone'], {
      orderBy: { column: 'name', ascending: true }
    });
  }
  
  async searchCategories(query: string) {
    return this.search(query, ['kode', 'name', 'description'], {
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
    });
  }
  
  async searchTypes(query: string) {
    return this.search(query, ['kode', 'name', 'description'], {
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
    });
  }
  
  async searchUnits(query: string) {
    return this.search(query, ['kode', 'name', 'description'], {
      select: 'id, kode, name, description, updated_at',
      orderBy: { column: 'kode', ascending: true }
    });
  }
}

// Export singleton instances
export const categoryService = new CategoryService();
export const medicineTypeService = new MedicineTypeService();
export const unitService = new UnitService();
export const supplierService = new SupplierService();

// Master Data Service Facade
export class MasterDataService {
  categories = categoryService;
  types = medicineTypeService;
  units = unitService;
  suppliers = supplierService;

  // Bulk operations for master data
  async getAllMasterData() {
    const [categories, types, units, suppliers] = await Promise.all([
      this.categories.getActiveCategories(),
      this.types.getActiveTypes(),
      this.units.getActiveUnits(),
      this.suppliers.getActiveSuppliers()
    ]);

    return {
      categories: categories.data || [],
      types: types.data || [],
      units: units.data || [],
      suppliers: suppliers.data || [],
      errors: {
        categories: categories.error,
        types: types.error,
        units: units.error,
        suppliers: suppliers.error
      }
    };
  }
}

export const masterDataService = new MasterDataService();