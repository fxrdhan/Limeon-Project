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
export { useDosageMutations } from './useDosages';
export { useManufacturerMutations, useManufacturers } from './useManufacturers';
export * from './usePurchases';
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
export * from './useCustomers';
