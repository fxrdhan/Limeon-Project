// Re-export all query hooks for easy import
export * from './useMasterData';
export {
  useItemUnits,
  useItemUnit,
  useItemUnitMutations,
} from './useMasterData';
export {
  useItems,
  useItem,
  useSearchItems,
  useItemsByCategory,
  useItemsByType,
  useLowStockItems as useItemsLowStock,
  useItemMutations,
  useCheckCodeUniqueness,
  useCheckBarcodeUniqueness,
} from './useItems';
export {
  useCategoriesRealtime,
  useMedicineTypesRealtime,
  useUnitsRealtime,
  useItemUnitsRealtime,
  useItemsRealtime,
  useDosagesRealtime,
  useManufacturersRealtime,
} from '../realtime/useMasterDataRealtime';
export { useDosageMutations } from './useDosages';
export { useManufacturerMutations, useManufacturers } from './useManufacturers';
export * from './usePurchases';
export { usePurchasesRealtime } from './usePurchasesRealtime';
export {
  useDashboardStats,
  useSalesAnalytics,
  useTopSellingMedicines,
  useLowStockItems as useDashboardLowStock,
  useRecentTransactions,
  useMonthlyRevenueComparison,
  useDashboardData,
} from './useDashboard';
export * from './usePatientsDoctors';
export {
  useDoctorsRealtime,
  usePatientsRealtime,
} from './usePatientsDoctorsRealtime';
