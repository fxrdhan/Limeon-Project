import type {
  AdditionalInformation,
  CompanyDetails,
  CustomerInformation,
  ExtractedInvoiceData,
  InvoiceInformation,
  PaymentSummary,
  ProductListItem,
} from '@/types';

export interface NormalizedConfirmInvoiceRouteState {
  invoiceData: ExtractedInvoiceData;
  imageIdentifier: string | null;
  processingTime: string | null;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown) => {
  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  return undefined;
};

const readNumber = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }

  const numericValue =
    typeof value === 'number' || typeof value === 'string'
      ? Number(value)
      : Number.NaN;

  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const normalizeCompanyDetails = (
  value: unknown
): CompanyDetails | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    name: readString(value.name),
    address: readString(value.address),
    license_dak: readString(value.license_dak),
    certificate_cdob: readString(value.certificate_cdob),
  };
};

const normalizeInvoiceInformation = (
  value: unknown
): InvoiceInformation | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    invoice_number: readString(value.invoice_number),
    invoice_date: readString(value.invoice_date),
    due_date: readString(value.due_date),
  };
};

const normalizeCustomerInformation = (
  value: unknown
): CustomerInformation | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    customer_name: readString(value.customer_name),
    customer_address: readString(value.customer_address),
  };
};

const normalizeProductListItem = (value: unknown): ProductListItem | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    sku: readString(value.sku),
    product_name: readString(value.product_name),
    quantity: readNumber(value.quantity),
    unit: readString(value.unit),
    batch_number: readString(value.batch_number),
    expiry_date: readString(value.expiry_date),
    unit_price: readNumber(value.unit_price),
    discount: readNumber(value.discount),
    total_price: readNumber(value.total_price),
  };
};

const normalizeProductList = (
  value: unknown
): ExtractedInvoiceData['product_list'] | undefined => {
  if (value === null) {
    return null;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.flatMap(product => {
    const normalizedProduct = normalizeProductListItem(product);
    return normalizedProduct ? [normalizedProduct] : [];
  });
};

const normalizePaymentSummary = (
  value: unknown
): PaymentSummary | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    total_price: readNumber(value.total_price),
    vat: readNumber(value.vat),
    invoice_total: readNumber(value.invoice_total),
  };
};

const normalizeAdditionalInformation = (
  value: unknown
): AdditionalInformation | undefined => {
  if (!isObjectRecord(value)) {
    return undefined;
  }

  return {
    checked_by: readString(value.checked_by),
  };
};

export const normalizeExtractedInvoiceData = (
  value: unknown
): ExtractedInvoiceData | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    company_details: normalizeCompanyDetails(value.company_details),
    invoice_information: normalizeInvoiceInformation(value.invoice_information),
    customer_information: normalizeCustomerInformation(
      value.customer_information
    ),
    product_list: normalizeProductList(value.product_list),
    payment_summary: normalizePaymentSummary(value.payment_summary),
    additional_information: normalizeAdditionalInformation(
      value.additional_information
    ),
    rawText: readString(value.rawText),
    imageIdentifier: readString(value.imageIdentifier),
  };
};

export const normalizeConfirmInvoiceRouteState = (
  value: unknown
): NormalizedConfirmInvoiceRouteState | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const invoiceData = normalizeExtractedInvoiceData(value.extractedData);
  if (!invoiceData) {
    return null;
  }

  return {
    invoiceData,
    imageIdentifier:
      readString(value.imageIdentifier) ??
      readString(invoiceData.imageIdentifier) ??
      null,
    processingTime: readString(value.processingTime) ?? null,
  };
};
