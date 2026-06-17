export interface DBSale {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  customer_id?: string;
  invoice_number?: string;
  date: string;
  total: number;
  payment_method: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DBSaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_name?: string | null;
  inventory_unit_id?: string | null;
  unit_id?: string | null;
  unit_conversion_rate?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaleWithDetails {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  customer_id?: string;
  invoice_number?: string;
  date: string;
  total: number;
  payment_method: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
  doctor?: {
    id: string;
    name: string;
    specialization?: string;
  } | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  created_by_user?: {
    id: string;
    name: string;
  } | null;
}

export interface SaleItemWithDetails {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_name?: string | null;
  inventory_unit_id?: string | null;
  unit_id?: string | null;
  unit_conversion_rate?: number | null;
  created_at?: string;
  updated_at?: string;
  item: {
    id: string;
    name: string;
    code?: string;
    manufacturer?: string;
  };
}

export interface SalesListItem {
  id: string;
  invoice_number: string | null;
  date: string;
  total: number;
  payment_method: string;
  patient: { id: string; name: string; phone?: string | null } | null;
  doctor: { id: string; name: string; specialization?: string | null } | null;
  customer: { id: string; name: string; phone?: string | null } | null;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalSales: number;
  averageSale: number;
  paymentMethods: Record<string, number>;
}

export type SaleCreateInput = Omit<DBSale, 'id' | 'created_at' | 'updated_at'>;

export type SaleUpdateInput = Partial<Omit<DBSale, 'id' | 'created_at'>>;

export type SaleItemInput = Omit<
  DBSaleItem,
  'id' | 'sale_id' | 'created_at' | 'updated_at'
>;
