// Dashboard and analytics types
export interface RegularDashboardProps {
  stats: {
    totalSales: number;
    totalPurchases: number;
    totalMedicines: number;
    lowStockCount: number;
  };
  salesData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  };
  topMedicines: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
  };
}