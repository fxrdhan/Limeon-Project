import { dashboardService } from '@/services/api/dashboard.service';

export const fetchDashboardSummary = () =>
  dashboardService.getDashboardSummary();

export const fetchDashboardStats = () => dashboardService.getDashboardStats();

export const fetchSalesAnalytics = (days: number) =>
  dashboardService.getSalesAnalytics(days);

export const fetchTopSellingMedicines = (limit: number) =>
  dashboardService.getTopSellingMedicines(limit);

export const fetchLowStockItems = (threshold: number) =>
  dashboardService.getLowStockItems(threshold);

export const fetchRecentTransactions = (limit: number) =>
  dashboardService.getRecentTransactions(limit);

export const fetchMonthlyRevenueComparison = () =>
  dashboardService.getMonthlyRevenueComparison();
