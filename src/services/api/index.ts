// Re-export all services for easy import
export * from './base.service';
export * from './items.service';
export * from './purchases.service';
export * from './sales.service';
export * from './auth.service';
export * from './companyProfile.service';
export * from './users.service';
export * from './customerLevels.service';
export * from './masterData.service';
export * from './patients-doctors.service';
export * from './chat.service';
export * from './storage.service';

// Export dashboard service with different response type name
export {
  DashboardService,
  type DashboardStats,
  type SalesAnalyticsData,
  type TopSellingMedicine,
  type ServiceResponse as DashboardServiceResponse,
} from './dashboard.service';

// Export service instances
export { itemsService } from './items.service';
export { purchasesService } from './purchases.service';
export { salesService } from './sales.service';
export { authService } from './auth.service';
export { companyProfileService } from './companyProfile.service';
export { usersService } from './users.service';
export { customerLevelsService } from './customerLevels.service';
export { chatService } from './chat.service';
export { StorageService } from './storage.service';
export { dashboardService } from './dashboard.service';
export {
  masterDataService,
  categoryService,
  medicineTypeService,
  itemPackageService,
  itemDosageService,
  itemManufacturerService,
  supplierService,
} from './masterData.service';
export {
  patientsService,
  doctorsService,
  patientsDoctorsService,
} from './patients-doctors.service';
