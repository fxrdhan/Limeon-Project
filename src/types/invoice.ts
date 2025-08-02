// Invoice extraction types
export interface CompanyDetails {
  name?: string;
  address?: string;
  license_dak?: string;
  certificate_cdob?: string;
}

export interface InvoiceInformation {
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
}

export interface CustomerInformation {
  customer_name?: string;
  customer_address?: string;
}

export interface ProductListItem {
  sku?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_price?: number;
  discount?: number;
  total_price?: number;
}

export interface PaymentSummary {
  total_price?: number;
  vat?: number;
  invoice_total?: number;
}

export interface AdditionalInformation {
  checked_by?: string;
}

export interface ExtractedInvoiceData {
  company_details?: CompanyDetails;
  invoice_information?: InvoiceInformation;
  customer_information?: CustomerInformation;
  product_list?: ProductListItem[] | null;
  payment_summary?: PaymentSummary;
  additional_information?: AdditionalInformation;
  rawText?: string;
  imageIdentifier?: string;
}
