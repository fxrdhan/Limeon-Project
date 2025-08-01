// Re-export all query hooks for easy import
export * from './useMasterData';
export { 
  useItems, 
  useItem, 
  useSearchItems,
  useItemsByCategory,
  useItemsByType,
  useLowStockItems as useItemsLowStock,
  useItemMutations,
  useCheckCodeUniqueness,
  useCheckBarcodeUniqueness
} from './useItems';
export { 
  useCategoriesRealtime,
  useMedicineTypesRealtime, 
  useUnitsRealtime,
  useItemsRealtime,
  useDosagesRealtime
} from './useMasterDataRealtime';
export { 
  useDosageMutations
} from './useDosages';
export * from './usePurchases';
export {
  useDashboardStats,
  useSalesAnalytics,
  useTopSellingMedicines,
  useLowStockItems as useDashboardLowStock,
  useRecentTransactions,
  useMonthlyRevenueComparison,
  useDashboardData
} from './useDashboard';
export * from './usePatientsDoctors';