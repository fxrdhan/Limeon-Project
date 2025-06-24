interface RawGeminiProduct {
  sku?: string;
  product_name?: string;
  count?: number;
  unit?: string;
  batch_no?: string;
  expiry_date?: string;
  price_per_unit?: string;
  discount?: string;
  total_price?: string;
}

interface RawGeminiData {
  company?: {
    name?: string;
    address?: string;
  };
  invoice?: {
    number?: string;
    date?: string;
    so_number?: string;
    due_date?: string;
  };
  customer?: {
    name?: string;
    address?: string;
  };
  products?: RawGeminiProduct[];
  payment_summary?: {
    total_price?: string;
    vat?: string;
    total_invoice?: string;
  };
  additional_information?: {
    checked_by?: string;
  };
}

interface TransformedProduct {
  sku?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
  batch_number?: string;
  expiry_date?: string;
  unit_price: number;
  discount: number;
  total_price: number;
}

interface TransformedData {
  company_details: {
    name?: string;
    address?: string;
  };
  invoice_information: {
    invoice_number?: string;
    invoice_date?: string;
    so_number?: string;
    due_date?: string;
  };
  customer_information: {
    customer_name?: string;
    customer_address?: string;
  };
  product_list: TransformedProduct[];
  payment_summary: {
    total_price: number;
    vat: number;
    invoice_total: number;
  };
  additional_information: {
    checked_by?: string;
  };
}

interface ParseResult {
  rawText?: string;
  company_details?: {
    name?: string;
    address?: string;
  };
  invoice_information?: {
    invoice_number?: string;
    invoice_date?: string;
    so_number?: string;
    due_date?: string;
  };
  customer_information?: {
    customer_name?: string;
    customer_address?: string;
  };
  product_list?: TransformedProduct[];
  payment_summary?: {
    total_price: number;
    vat: number;
    invoice_total: number;
  };
  additional_information?: {
    checked_by?: string;
  };
}

const parseNumericValue = (value?: string): number => {
    if (!value || typeof value !== "string") return 0;
    
    let cleaned = value.replace(/Rp|\s/g, "");
    
    const sepCount = (cleaned.match(/[.,]/g) || []).length;
    
    if (sepCount > 1) {
        if (cleaned.indexOf(",") === -1 && cleaned.indexOf(".") !== -1) {
            const parts = cleaned.split(".");
            if (parts.length > 2 && parts[parts.length-1].length === 2) {
                return parseFloat(parts.slice(0, -1).join("") + "." + parts[parts.length-1]) || 0;
            }
        }
        
        const lastSep = cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",") ? "." : ",";
        cleaned = cleaned
            .split(lastSep)
            .join("DEC")
            .replace(/[.,]/g, "")
            .replace("DEC", ".");
    } else {
        cleaned = cleaned.replace(",", ".");
    }
    
    return parseFloat(cleaned) || 0;
};

const parseDiscountValue = (value?: string): number => {
    if (!value || typeof value !== "string") return 0;
    const num = parseFloat(value.replace(/[%-]/g, ""));
    return num || 0;
};

const transformGeminiResponse = (rawData: RawGeminiData | null, rawText: string): TransformedData | { rawText: string } => {
    if (!rawData || typeof rawData !== "object") {
        return { rawText };
    }

    return {
        company_details: {
            name: rawData.company?.name,
            address: rawData.company?.address,
        },
        invoice_information: {
            invoice_number: rawData.invoice?.number,
            invoice_date: rawData.invoice?.date,
            so_number: rawData.invoice?.so_number,
            due_date: rawData.invoice?.due_date,
        },
        customer_information: {
            customer_name: rawData.customer?.name,
            customer_address: rawData.customer?.address,
        },
        product_list:
            rawData.products?.map((p: RawGeminiProduct): TransformedProduct => ({
                sku: p.sku,
                product_name: p.product_name,
                quantity: p.count,
                unit: p.unit,
                batch_number: p.batch_no,
                expiry_date: p.expiry_date,
                unit_price: parseNumericValue(p.price_per_unit),
                discount: parseDiscountValue(p.discount),
                total_price: parseNumericValue(p.total_price),
            })) || [],
        payment_summary: {
            total_price: parseNumericValue(rawData.payment_summary?.total_price),
            vat: parseNumericValue(rawData.payment_summary?.vat),
            invoice_total: parseNumericValue(rawData.payment_summary?.total_invoice),
        },
        additional_information: {
            checked_by: rawData.additional_information?.checked_by,
        },
    };
};

export const parseAndTransformResponse = (rawText: string): ParseResult => {
    try {
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = match?.[1]?.trim() || rawText.trim();
        const rawJsonData: RawGeminiData = JSON.parse(jsonString);
        return transformGeminiResponse(rawJsonData, rawText);
    } catch (e) {
        console.error("JSON parse error:", e);
        return { rawText };
    }
};