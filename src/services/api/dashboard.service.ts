import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

export interface DashboardStats {
  totalSales: number;
  totalPurchases: number;
  totalMedicines: number;
  lowStockCount: number;
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

export class DashboardService {
  // Get overall dashboard statistics
  async getDashboardStats(): Promise<ServiceResponse<DashboardStats>> {
    try {
      // Fetch all data in parallel for better performance
      const [salesResult, purchasesResult, medicinesResult, lowStockResult] =
        await Promise.all([
          supabase.from('sales').select('total'),
          supabase.from('purchases').select('total'),
          supabase.from('items').select('*', { count: 'exact' }),
          supabase
            .from('items')
            .select('*', { count: 'exact' })
            .lt('stock', 10),
        ]);

      // Check for errors
      if (salesResult.error) throw salesResult.error;
      if (purchasesResult.error) throw purchasesResult.error;
      if (medicinesResult.error) throw medicinesResult.error;
      if (lowStockResult.error) throw lowStockResult.error;

      // Calculate totals
      const totalSales = salesResult.data
        ? salesResult.data.reduce((sum, sale) => sum + Number(sale.total), 0)
        : 0;

      const totalPurchases = purchasesResult.data
        ? purchasesResult.data.reduce(
            (sum, purchase) => sum + Number(purchase.total),
            0
          )
        : 0;

      const stats: DashboardStats = {
        totalSales,
        totalPurchases,
        totalMedicines: medicinesResult.count || 0,
        lowStockCount: lowStockResult.count || 0,
      };

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
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
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Get current month sales
      const currentMonthStart = new Date(currentYear, currentMonth, 1);
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);

      // Get previous month sales
      const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
      const prevMonthEnd = new Date(currentYear, currentMonth, 0);

      const [currentMonthResult, prevMonthResult] = await Promise.all([
        supabase
          .from('sales')
          .select('total')
          .gte('date', currentMonthStart.toISOString())
          .lte('date', currentMonthEnd.toISOString()),
        supabase
          .from('sales')
          .select('total')
          .gte('date', prevMonthStart.toISOString())
          .lte('date', prevMonthEnd.toISOString()),
      ]);

      if (currentMonthResult.error) throw currentMonthResult.error;
      if (prevMonthResult.error) throw prevMonthResult.error;

      const currentMonthTotal = (currentMonthResult.data || []).reduce(
        (sum, sale) => sum + Number(sale.total),
        0
      );
      const prevMonthTotal = (prevMonthResult.data || []).reduce(
        (sum, sale) => sum + Number(sale.total),
        0
      );

      const percentageChange =
        prevMonthTotal > 0
          ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
          : 0;

      return {
        data: {
          currentMonth: currentMonthTotal,
          previousMonth: prevMonthTotal,
          percentageChange,
          isIncrease: percentageChange > 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }
}

export const dashboardService = new DashboardService();
