import { GenericEntityService } from '@/services/api/genericEntity.service';
import {
  categoryService,
  itemDosageService,
  itemInventoryUnitService,
  itemManufacturerService,
  itemPackageService,
  medicineTypeService,
} from '@/services/api/masterData.service';
import { customerLevelsService } from '@/services/api/customerLevels.service';
import type { CustomerLevel } from '@/types/database';

type NamedEntityPayload = {
  code?: string;
  name: string;
  description?: string;
  address?: string;
};

export const itemMasterDataService = {
  createGenericEntityService<TEntity>(tableName: string) {
    return new GenericEntityService<TEntity>(tableName);
  },

  getCategoryCode(categoryId: string) {
    return categoryService.getById(categoryId, 'code');
  },
  getMedicineTypeCode(typeId: string) {
    return medicineTypeService.getById(typeId, 'code');
  },
  getPackageCode(packageId: string) {
    return itemPackageService.getById(packageId, 'code');
  },
  getDosageCode(dosageId: string) {
    return itemDosageService.getById(dosageId, 'code');
  },
  getManufacturerCode(manufacturerId: string) {
    return itemManufacturerService.getById(manufacturerId, 'code');
  },

  createCategory(payload: NamedEntityPayload) {
    return categoryService.create(payload);
  },
  listCategories() {
    return categoryService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });
  },
  createType(payload: NamedEntityPayload) {
    return medicineTypeService.create(payload);
  },
  listTypes() {
    return medicineTypeService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });
  },
  createPackage(payload: Omit<NamedEntityPayload, 'address'>) {
    return itemPackageService.create(payload);
  },
  listPackages() {
    return itemPackageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });
  },
  createDosage(payload: NamedEntityPayload) {
    return itemDosageService.create(payload);
  },
  listDosages() {
    return itemDosageService.getAll({
      select: 'id, code, name, description, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });
  },
  createManufacturer(payload: Omit<NamedEntityPayload, 'description'>) {
    return itemManufacturerService.create(payload);
  },
  listManufacturers() {
    return itemManufacturerService.getAll({
      select: 'id, code, name, address, created_at, updated_at',
      orderBy: { column: 'name', ascending: true },
    });
  },

  getActiveInventoryUnits() {
    return itemInventoryUnitService.getActiveInventoryUnits();
  },

  getCustomerLevels() {
    return customerLevelsService.getAll();
  },
  createCustomerLevel(payload: Omit<CustomerLevel, 'id'>) {
    return customerLevelsService.create(payload);
  },
  updateCustomerLevel(id: string, payload: Partial<CustomerLevel>) {
    return customerLevelsService.update(id, payload);
  },
  deleteCustomerLevel(id: string) {
    return customerLevelsService.delete(id);
  },
  seedDefaultCustomerLevels(
    payload: Array<{
      level_name: string;
      price_percentage: number;
      description?: string | null;
    }>
  ) {
    return customerLevelsService.seedDefaults(payload);
  },
};
