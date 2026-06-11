import type {
  SaleItemInput,
  SaleItemWithDetails,
  SalesAnalytics,
  SalesListItem,
  SaleWithDetails,
} from './sales.types';

type RelationValue<T> = T | T[] | null | undefined;

const getSingleRelation = <T>(value: RelationValue<T>): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

type SalesListRecord = Omit<
  SalesListItem,
  'patient' | 'doctor' | 'customer'
> & {
  patient: RelationValue<SalesListItem['patient']>;
  doctor: RelationValue<SalesListItem['doctor']>;
  customer: RelationValue<SalesListItem['customer']>;
};

export const mapSalesListItem = (item: unknown): SalesListItem => {
  const sale = item as SalesListRecord;
  return {
    ...sale,
    patient: getSingleRelation(sale.patient),
    doctor: getSingleRelation(sale.doctor),
    customer: getSingleRelation(sale.customer),
  };
};

export const mapSaleWithDetails = (sale: unknown): SaleWithDetails => {
  const saleData = sale as Record<string, unknown>;
  return {
    ...saleData,
    patient: saleData.patients as
      | { id: string; name: string; phone?: string }
      | undefined,
    doctor: saleData.doctors as
      | { id: string; name: string; specialization?: string }
      | undefined,
    customer: saleData.customers as
      | { id: string; name: string; phone?: string | null }
      | undefined,
    created_by_user: saleData.users as { id: string; name: string } | undefined,
  } as SaleWithDetails;
};

export const mapSaleItemWithDetails = (
  item: Record<string, unknown> & {
    items?: {
      id?: string;
      name?: string;
      code?: string;
      manufacturer?: string;
    } | null;
  }
): SaleItemWithDetails =>
  ({
    ...item,
    item: {
      id: item.items?.id || '',
      name: item.items?.name || '',
      code: item.items?.code || '',
      manufacturer: item.items?.manufacturer || '',
    },
  }) as SaleItemWithDetails;

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
  const paymentMethods = sales.reduce(
    (acc, sale) => {
      acc[sale.payment_method] =
        (acc[sale.payment_method] || 0) + Number(sale.total);
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalRevenue,
    totalSales,
    averageSale,
    paymentMethods,
  };
};
