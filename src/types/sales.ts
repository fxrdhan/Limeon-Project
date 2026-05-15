export interface SaleItem {
  item: {
    name: string;
    code: string;
  };
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_name: string;
  inventory_unit_id?: string | null;
  unit_id?: string | null;
  unit_conversion_rate: number;
}

export interface SaleData {
  id: string;
  invoice_number: string | null;
  date: string;
  total: number;
  payment_method: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  patient: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialization?: string | null;
  } | null;
}
