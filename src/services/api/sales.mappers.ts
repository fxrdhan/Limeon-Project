import {
  getSingleSupabaseRelation,
  type SupabaseRelationValue,
} from '@/lib/supabaseRelations';
import type {
  DBSale,
  DBSaleItem,
  SaleItemInput,
  SaleItemWithDetails,
  SalesAnalytics,
  SalesListItem,
  SaleWithDetails,
} from './sales.types';

export type SalesListRecord = Omit<
  SalesListItem,
  'patient' | 'doctor' | 'customer'
> & {
  patient: SupabaseRelationValue<SalesListItem['patient']>;
  doctor: SupabaseRelationValue<SalesListItem['doctor']>;
  customer: SupabaseRelationValue<SalesListItem['customer']>;
};

type SalePatient = NonNullable<SaleWithDetails['patient']>;
type SaleDoctor = NonNullable<SaleWithDetails['doctor']>;
type SaleCustomer = NonNullable<SaleWithDetails['customer']>;
type SaleUser = NonNullable<SaleWithDetails['created_by_user']>;

export type SaleDetailsRecord = DBSale & {
  patients?: SupabaseRelationValue<SalePatient>;
  doctors?: SupabaseRelationValue<SaleDoctor>;
  customers?: SupabaseRelationValue<SaleCustomer>;
  users?: SupabaseRelationValue<SaleUser>;
};

export type SaleItemDetailsRecord = DBSaleItem & {
  items?: {
    id?: string;
    name?: string;
    code?: string | null;
    manufacturer?: string | null;
  } | null;
};

export const mapSalesListItem = (sale: SalesListRecord): SalesListItem => ({
  ...sale,
  patient: getSingleSupabaseRelation(sale.patient),
  doctor: getSingleSupabaseRelation(sale.doctor),
  customer: getSingleSupabaseRelation(sale.customer),
});

export const mapSaleWithDetails = (
  sale: SaleDetailsRecord
): SaleWithDetails => {
  return {
    ...sale,
    patient: getSingleSupabaseRelation(sale.patients),
    doctor: getSingleSupabaseRelation(sale.doctors),
    customer: getSingleSupabaseRelation(sale.customers),
    created_by_user: getSingleSupabaseRelation(sale.users),
  };
};

export const mapSaleItemWithDetails = (
  item: SaleItemDetailsRecord
): SaleItemWithDetails => ({
  ...item,
  item: {
    id: item.items?.id || '',
    name: item.items?.name || '',
    code: item.items?.code || '',
    manufacturer: item.items?.manufacturer || '',
  },
});

export const buildSaleRpcItems = (items: SaleItemInput[]) =>
  items.map(item => ({
    item_id: item.item_id,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
    unit_name: item.unit_name,
    inventory_unit_id: item.inventory_unit_id ?? null,
    unit_id: item.unit_id ?? null,
  }));

export const calculateSalesAnalytics = (
  sales: Array<{ total: number | string; payment_method: string }>
): SalesAnalytics => {
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalSales = sales.length;
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  const paymentMethods: Record<string, number> = {};
  sales.forEach(sale => {
    paymentMethods[sale.payment_method] =
      (paymentMethods[sale.payment_method] || 0) + Number(sale.total);
  });

  return {
    totalRevenue,
    totalSales,
    averageSale,
    paymentMethods,
  };
};
