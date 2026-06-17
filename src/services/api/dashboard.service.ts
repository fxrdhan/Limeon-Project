import { supabase } from '@/lib/supabase';
import { formatDateOnlyDisplayValue } from '@/lib/formatters';
import {
  getSupabaseRelationName,
  type SupabaseRelationValue,
} from '@/lib/supabaseRelations';
import {
  toServiceError,
  type ServiceResponse as BaseServiceResponse,
} from './base.service';

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalMedicines: number;
  lowStockCount: number;
}

export interface MonthlyRevenueComparison {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  isIncrease: boolean;
}

export interface SalesAnalyticsData {
  labels: string[];
  values: number[];
  totalRevenue: number;
  averageDaily: number;
}

export interface TopSellingMedicine {
  name: string;
  total_quantity: number;
}

export interface LowStockDashboardItem {
  id: string;
  name: string;
  stock: number;
  item_categories?: NamedRelation[];
  item_types?: NamedRelation[];
  item_packages?: NamedRelation[];
}

export type ServiceResponse<T> = BaseServiceResponse<T>;

interface DashboardSummaryRow {
  total_sales: number | string | null;
  total_purchases: number | string | null;
  total_medicines: number | string | null;
  low_stock_count: number | string | null;
  current_month_sales: number | string | null;
  previous_month_sales: number | string | null;
}

export interface DashboardSummaryResponse {
  stats: DashboardStats;
  monthlyRevenue: MonthlyRevenueComparison;
}

interface NamedRelation {
  name?: string | null;
}

interface RecentTransactionBaseRow {
  id: string;
  invoice_number?: string | null;
  date: string;
  total: number;
}

interface RecentSaleRow extends RecentTransactionBaseRow {
  patients?: SupabaseRelationValue<NamedRelation>;
}

interface RecentPurchaseRow extends RecentTransactionBaseRow {
  suppliers?: SupabaseRelationValue<NamedRelation>;
}

export interface RecentDashboardTransaction extends RecentTransactionBaseRow {
  type: 'sale' | 'purchase';
  counterparty: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumericValue = (value: number | string | null | undefined) =>
  Number(value ?? 0);

const toFiniteNumericValue = (value: unknown) => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 0;

  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toSummaryNumericField = (
  value: unknown
): DashboardSummaryRow[keyof DashboardSummaryRow] =>
  typeof value === 'number' || typeof value === 'string' ? value : null;

export const normalizeDashboardSummaryRow = (
  value: unknown
): DashboardSummaryRow | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    total_sales: toSummaryNumericField(value.total_sales),
    total_purchases: toSummaryNumericField(value.total_purchases),
    total_medicines: toSummaryNumericField(value.total_medicines),
    low_stock_count: toSummaryNumericField(value.low_stock_count),
    current_month_sales: toSummaryNumericField(value.current_month_sales),
    previous_month_sales: toSummaryNumericField(value.previous_month_sales),
  };
};

const normalizeNamedRelationRecord = (value: unknown): NamedRelation | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { name } = value;
  return {
    name: typeof name === 'string' || name === null ? name : null,
  };
};

const normalizeNamedRelation = (
  value: unknown
): SupabaseRelationValue<NamedRelation> => {
  if (Array.isArray(value)) {
    return value.flatMap(relation => {
      const normalizedRelation = normalizeNamedRelationRecord(relation);
      return normalizedRelation ? [normalizedRelation] : [];
    });
  }

  return normalizeNamedRelationRecord(value);
};

const normalizeNamedRelationArray = (value: unknown): NamedRelation[] => {
  if (Array.isArray(value)) {
    return value.flatMap(relation => {
      const normalizedRelation = normalizeNamedRelationRecord(relation);
      return normalizedRelation ? [normalizedRelation] : [];
    });
  }

  const normalizedRelation = normalizeNamedRelationRecord(value);
  return normalizedRelation ? [normalizedRelation] : [];
};

const normalizeRecentTransactionBaseRow = (
  value: unknown
): RecentTransactionBaseRow | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { date, id, invoice_number, total } = value;
  if (typeof id !== 'string' || typeof date !== 'string') {
    return null;
  }

  return {
    id,
    invoice_number:
      typeof invoice_number === 'string' || invoice_number === null
        ? invoice_number
        : null,
    date,
    total: toFiniteNumericValue(total),
  };
};

const normalizeRecentSaleRow = (value: unknown): RecentSaleRow | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const baseRow = normalizeRecentTransactionBaseRow(value);
  if (!baseRow) {
    return null;
  }

  return {
    ...baseRow,
    patients: normalizeNamedRelation(value.patients),
  };
};

const normalizeRecentPurchaseRow = (
  value: unknown
): RecentPurchaseRow | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const baseRow = normalizeRecentTransactionBaseRow(value);
  if (!baseRow) {
    return null;
  }

  return {
    ...baseRow,
    suppliers: normalizeNamedRelation(value.suppliers),
  };
};

export const normalizeRecentSaleRows = (value: unknown): RecentSaleRow[] =>
  Array.isArray(value)
    ? value.flatMap(row => {
        const normalizedRow = normalizeRecentSaleRow(row);
        return normalizedRow ? [normalizedRow] : [];
      })
    : [];

export const normalizeRecentPurchaseRows = (
  value: unknown
): RecentPurchaseRow[] =>
  Array.isArray(value)
    ? value.flatMap(row => {
        const normalizedRow = normalizeRecentPurchaseRow(row);
        return normalizedRow ? [normalizedRow] : [];
      })
    : [];

const normalizeLowStockDashboardItem = (
  value: unknown
): LowStockDashboardItem | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { id, item_categories, item_packages, item_types, name, stock } = value;
  if (typeof id !== 'string' || typeof name !== 'string') {
    return null;
  }

  return {
    id,
    name,
    stock: toFiniteNumericValue(stock),
    item_categories: normalizeNamedRelationArray(item_categories),
    item_types: normalizeNamedRelationArray(item_types),
    item_packages: normalizeNamedRelationArray(item_packages),
  };
};

export const normalizeLowStockDashboardItems = (
  value: unknown
): LowStockDashboardItem[] =>
  Array.isArray(value)
    ? value.flatMap(item => {
        const normalizedItem = normalizeLowStockDashboardItem(item);
        return normalizedItem ? [normalizedItem] : [];
      })
    : [];

const buildMonthlyRevenueComparison = (
  currentMonthTotal: number,
  previousMonthTotal: number
): MonthlyRevenueComparison => {
  const percentageChange =
    previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : 0;

  return {
    currentMonth: currentMonthTotal,
    previousMonth: previousMonthTotal,
    percentageChange,
    isIncrease: percentageChange > 0,
  };
};

export const mapRecentDashboardTransactions = (
  sales: RecentSaleRow[],
  purchases: RecentPurchaseRow[],
  limit: number
): RecentDashboardTransaction[] => {
  const transactions: RecentDashboardTransaction[] = [
    ...sales.map(sale => ({
      ...sale,
      type: 'sale' as const,
      counterparty: getSupabaseRelationName(sale.patients, 'Walk-in Customer'),
    })),
    ...purchases.map(purchase => ({
      ...purchase,
      type: 'purchase' as const,
      counterparty: getSupabaseRelationName(
        purchase.suppliers,
        'Unknown Supplier'
      ),
    })),
  ];

  transactions.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return transactions.slice(0, limit);
};

export class DashboardService {
  async getDashboardSummary(): Promise<
    ServiceResponse<DashboardSummaryResponse>
  > {
    try {
      const { data, error } = await supabase
        .rpc('get_dashboard_summary')
        .single();

      if (error) throw error;

      const summary = normalizeDashboardSummaryRow(data);
      if (!summary) {
        throw new Error('Missing dashboard summary data');
      }

      const stats: DashboardStats = {
        totalSales: toNumericValue(summary.total_sales),
        totalPurchases: toNumericValue(summary.total_purchases),
        totalMedicines: toNumericValue(summary.total_medicines),
        lowStockCount: toNumericValue(summary.low_stock_count),
      };

      return {
        data: {
          stats,
          monthlyRevenue: buildMonthlyRevenueComparison(
            toNumericValue(summary.current_month_sales),
            toNumericValue(summary.previous_month_sales)
          ),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  }

  // Get overall dashboard statistics
  async getDashboardStats(): Promise<ServiceResponse<DashboardStats>> {
    const result = await this.getDashboardSummary();
    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    return {
      data: result.data.stats,
      error: null,
    };
  }

  // Get sales analytics for a date range
  async getSalesAnalytics(
    days: number = 7
  ): Promise<ServiceResponse<SalesAnalyticsData>> {
    try {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sales')
        .select('date, total')
        .gte('date', startDate.toISOString())
        .order('date');

      if (error) throw error;

      if (!data) {
        return { data: null, error: new Error('No sales data found') };
      }

      // Group sales by date
      const salesByDate = data.reduce<Record<string, number>>((acc, sale) => {
        const date = formatDateOnlyDisplayValue(sale.date);
        if (!acc[date]) acc[date] = 0;
        acc[date] += Number(sale.total);
        return acc;
      }, {});

      // Create labels and values for all days in range
      const labels: string[] = [];
      const values: number[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateStr = date.toLocaleDateString('id-ID');
        labels.push(dateStr);
        values.push(salesByDate[dateStr] || 0);
      }

      const totalRevenue = values.reduce((sum, value) => sum + value, 0);
      const averageDaily = totalRevenue / days;

      const analyticsData: SalesAnalyticsData = {
        labels,
        values,
        totalRevenue,
        averageDaily,
      };

      return { data: analyticsData, error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  }

  // Get top selling medicines
  async getTopSellingMedicines(
    limit: number = 5
  ): Promise<ServiceResponse<TopSellingMedicine[]>> {
    try {
      const { data, error } = await supabase.rpc('get_top_selling_medicines', {
        limit_count: limit,
      });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  }

  // Get low stock items
  async getLowStockItems(
    threshold: number = 10
  ): Promise<ServiceResponse<LowStockDashboardItem[]>> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(
          `
          id,
          name,
          stock,
          item_categories (name),
          item_types (name),
          item_packages (name)
        `
        )
        .lte('stock', threshold)
        .order('stock', { ascending: true })
        .limit(10);

      if (error) throw error;

      return { data: normalizeLowStockDashboardItems(data), error: null };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  }

  // Get recent transactions
  async getRecentTransactions(limit: number = 10) {
    try {
      const [salesResult, purchasesResult] = await Promise.all([
        supabase
          .from('sales')
          .select(
            `
            id,
            invoice_number,
            date,
            total,
            patients (name)
          `
          )
          .order('date', { ascending: false })
          .limit(limit),
        supabase
          .from('purchases')
          .select(
            `
            id,
            invoice_number,
            date,
            total,
            suppliers (name)
          `
          )
          .order('date', { ascending: false })
          .limit(limit),
      ]);

      if (salesResult.error) throw salesResult.error;
      if (purchasesResult.error) throw purchasesResult.error;

      return {
        data: mapRecentDashboardTransactions(
          normalizeRecentSaleRows(salesResult.data),
          normalizeRecentPurchaseRows(purchasesResult.data),
          limit
        ),
        error: null,
      };
    } catch (error) {
      return { data: null, error: toServiceError(error) };
    }
  }

  // Get monthly revenue comparison
  async getMonthlyRevenueComparison() {
    const result = await this.getDashboardSummary();
    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    return {
      data: result.data.monthlyRevenue,
      error: null,
    };
  }
}

export const dashboardService = new DashboardService();
