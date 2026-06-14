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
