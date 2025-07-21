// Re-export all services for easy import
export * from './base.service';
export * from './items.service';
export * from './purchases.service';
export * from './masterData.service';

// Export service instances
export { itemsService } from './items.service';
export { purchasesService } from './purchases.service';
export { 
  masterDataService,
  categoryService,
  medicineTypeService,
  unitService,
  supplierService
} from './masterData.service';