const parseNumericValue = (value) => {
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

const parseDiscountValue = (value) => {
    if (!value || typeof value !== "string") return 0;
    const num = parseFloat(value.replace(/[%\-]/g, ""));
    return num || 0;
};

const transformGeminiResponse = (rawData, rawText) => {
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
            rawData.products?.map((p) => ({
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

const parseAndTransformResponse = (rawText) => {
    try {
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonString = match?.[1]?.trim() || rawText.trim();
        const rawJsonData = JSON.parse(jsonString);
        return transformGeminiResponse(rawJsonData, rawText);
    } catch (e) {
        console.error("JSON parse error:", e);
        return { rawText };
    }
};

module.exports = { parseAndTransformResponse };
