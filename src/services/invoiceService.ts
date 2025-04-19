import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_INVOICE_EXTRACTOR_API_URL || 'http://localhost:3000/api/extract-invoice';

interface CompanyDetails {
    name?: string;
    address?: string;
    license_dak?: string;
    certificate_cdob?: string;
}

interface InvoiceInformation {
    invoice_number?: string;
    invoice_date?: string;
    due_date?: string;
}

interface CustomerInformation {
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

interface PaymentSummary {
    total_price?: number;
    vat?: number;
    invoice_total?: number;
}

interface AdditionalInformation {
    checked_by?: string;
}

export interface ExtractedInvoiceData {
    company_details?: CompanyDetails;
    invoice_information?: InvoiceInformation;
    customer_information?: CustomerInformation;
    product_list?: ProductListItem[];
    payment_summary?: PaymentSummary;
    additional_information?: AdditionalInformation;
    rawText?: string;
}

export async function uploadAndExtractInvoice(file: File): Promise<ExtractedInvoiceData> {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await axios.post<ExtractedInvoiceData>(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new Error('Format respons tidak valid dari API ekstraksi.');
        }
        return responseData;

    } catch (error: unknown) {
        console.error("Error details:", error);
        let errorMessage = 'Gagal mengekstrak data faktur. Silakan coba lagi.';
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string; details?: string } | string>;
            console.error("Axios error status:", axiosError.status);
            console.error("Axios error response:", axiosError.response?.data);
            console.error("Axios error request config:", axiosError.config);

            if (typeof axiosError.response?.data === 'object' && axiosError.response.data !== null && 'error' in axiosError.response.data) {
                errorMessage = (axiosError.response.data as { error: string }).error;
                if ('details' in axiosError.response.data && (axiosError.response.data as { details: string }).details) {
                    errorMessage += `: ${(axiosError.response.data as { details: string }).details}`;
                }
            } else if (axiosError.message) {
                errorMessage = axiosError.message;
            }
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    }
}

export async function saveInvoiceToDatabase(extractedData: ExtractedInvoiceData): Promise<{ id: string; success: boolean }> {
    try {
        if (!extractedData.invoice_information?.invoice_number) {
            throw new Error('Nomor faktur tidak ditemukan dalam data ekstraksi.');
        }
        if (!extractedData.invoice_information?.invoice_date) {
            throw new Error('Tanggal faktur tidak ditemukan dalam data ekstraksi.');
        }
        if (!extractedData.company_details?.name) {
            throw new Error('Nama supplier tidak ditemukan dalam data ekstraksi.');
        }
        if (!extractedData.customer_information?.customer_name) {
            throw new Error('Nama pelanggan tidak ditemukan dalam data ekstraksi.');
        }

        const { data: invoiceData, error: invoiceError } = await supabase
            .from('e_invoices')
            .insert({
                invoice_number: extractedData.invoice_information.invoice_number,
                invoice_date: extractedData.invoice_information.invoice_date,
                due_date: extractedData.invoice_information.due_date,
                supplier_name: extractedData.company_details.name,
                supplier_address: extractedData.company_details.address,
                dak_license_number: extractedData.company_details.license_dak,
                cdob_certificate_number: extractedData.company_details.certificate_cdob,
                customer_name: extractedData.customer_information.customer_name,
                customer_address: extractedData.customer_information.customer_address,
                total_price: extractedData.payment_summary?.total_price ?? 0,
                ppn: extractedData.payment_summary?.vat ?? 0,
                total_invoice: extractedData.payment_summary?.invoice_total ?? 0,
                checked_by: extractedData.additional_information?.checked_by,
                json_data: extractedData
            })
            .select('id')
            .single();

        if (invoiceError) {
            console.error("Supabase invoice insert error:", invoiceError);
            throw new Error(`Gagal menyimpan header faktur: ${invoiceError.message}`);
        }
        if (!invoiceData) {
            throw new Error('Gagal mendapatkan ID header faktur setelah insert.');
        }

        const invoiceItems = (extractedData.product_list ?? []).map((product: ProductListItem) => ({
            invoice_id: invoiceData.id,
            sku: product.sku,
            product_name: product.product_name ?? 'Produk Tidak Dikenal',
            quantity: product.quantity ?? 0,
            unit: product.unit,
            batch_number: product.batch_number,
            expiry_date: product.expiry_date,
            unit_price: product.unit_price ?? 0,
            discount: product.discount ?? 0,
            total_price: product.total_price ?? 0
        }));

        if (invoiceItems.length > 0) {
            const { error: itemsError } = await supabase
                .from('e_invoice_items')
                .insert(invoiceItems);

            if (itemsError) {
                console.error("Supabase items insert error:", itemsError);
                throw new Error(`Gagal menyimpan item faktur: ${itemsError.message}`);
            }
        } else {
            console.warn(`Invoice ${invoiceData.id} disimpan tanpa item produk.`);
        }

        return { id: invoiceData.id, success: true };

    } catch (error: unknown) {
        console.error('Error menyimpan data faktur ke database:', error);
        if (error instanceof Error) {
            throw new Error(`Gagal menyimpan faktur ke database: ${error.message}`);
        } else {
            throw new Error('Gagal menyimpan faktur ke database: Terjadi kesalahan tidak dikenal.');
        }
    }
}

export async function processInvoice(file: File): Promise<ExtractedInvoiceData> {
    try {
        const extractedData = await uploadAndExtractInvoice(file);
        return extractedData;
    } catch (error: unknown) {
        console.error('Error processing invoice:', error);
        if (error instanceof Error) {
            throw new Error(
                error.message || 'Terjadi kesalahan saat memproses faktur'
            );
        } else {
            throw new Error('Terjadi kesalahan tidak dikenal saat memproses faktur');
        }
    }
}