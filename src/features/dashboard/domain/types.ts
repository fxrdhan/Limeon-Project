export interface DashboardStatsSummary {
  totalSales: number;
  totalPurchases: number;
  totalMedicines: number;
  lowStockCount: number;
}

export interface SalesAnalyticsSummary {
  labels: string[];
  values: number[];
  totalRevenue: number;
  averageDaily: number;
}

export interface TopMedicineSummary {
  name: string;
  total_quantity: number;
}

export interface MonthlyRevenueSummary {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  isIncrease: boolean;
}

export interface SalesPeakSummary {
  label: string;
  value: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  stock: number;
  item_categories?: { name: string }[];
  item_packages?: { name: string }[];
}

export interface RecentTransaction {
  id: string;
  type: 'sale' | 'purchase';
  invoice_number?: string;
  counterparty: string;
  date: string;
  total: number;
}
