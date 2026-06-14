export interface PurchaseListItem {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
  payment_status: string;
  payment_method: string;
  supplier: { name: string } | null;
}
