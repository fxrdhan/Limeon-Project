import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

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

export interface ServiceResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

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

const toNumericValue = (value: number | string | null | undefined) =>
  Number(value ?? 0);

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

export class DashboardService {
  async getDashboardSummary(): Promise<
    ServiceResponse<DashboardSummaryResponse>
  > {
    try {
      const { data, error } = await supabase
        .rpc('get_dashboard_summary')
        .single();

      if (error) throw error;

      const summary = (data || null) as DashboardSummaryRow | null;
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
      return { data: null, error: error as PostgrestError };
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
        const date = new Date(sale.date).toLocaleDateString('id-ID');
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
      return { data: null, error: error as PostgrestError };
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
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get low stock items
  async getLowStockItems(threshold: number = 10) {
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

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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

      // Combine and sort transactions
      const transactions = [
        ...(salesResult.data || []).map(sale => ({
          ...sale,
          type: 'sale' as const,
          counterparty:
            (sale as Record<string, { name?: string }>).patients?.name ||
            'Walk-in Customer',
        })),
        ...(purchasesResult.data || []).map(purchase => ({
          ...purchase,
          type: 'purchase' as const,
          counterparty:
            (purchase as Record<string, { name?: string }>).suppliers?.name ||
            'Unknown Supplier',
        })),
      ];

      // Sort by date descending
      transactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return { data: transactions.slice(0, limit), error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
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
