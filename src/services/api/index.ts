// Re-export all services for easy import
export * from './base.service';
export * from './items.service';
export * from './purchases.service';
export * from './sales.service';
export * from './auth.service';
export * from './masterData.service';
export * from './patients-doctors.service';

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
export { dashboardService } from './dashboard.service';
export {
  masterDataService,
  categoryService,
  medicineTypeService,
  itemPackageService,
  supplierService,
} from './masterData.service';
export {
  patientsService,
  doctorsService,
  patientsDoctorsService,
} from './patients-doctors.service';
