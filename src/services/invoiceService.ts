// src/services/invoiceService.ts
import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase'; // Pastikan path ini benar relatif terhadap src/services/

// URL ke backend ekstraksi faktur (Sebaiknya gunakan environment variable)
const API_URL = import.meta.env.VITE_INVOICE_EXTRACTOR_API_URL || 'http://localhost:3000/api/extract-invoice';

// --- Definisikan Interface untuk Struktur Data Hasil Ekstraksi ---

interface CompanyDetails {
    name?: string;
    address?: string;
    license_pbf?: string;
    license_dak?: string;
    certificate_cdob?: string;
}

interface InvoiceInformation {
    invoice_number?: string;
    invoice_date?: string; // Pertimbangkan tipe Date jika backend mengembalikan format ISO
    so_number?: string;
    due_date?: string; // Pertimbangkan tipe Date
}

interface CustomerInformation {
    customer_name?: string;
    customer_address?: string;
    customer_id?: string; // Jika ada
}

interface ProductListItem {
    sku?: string;
    product_name?: string;
    quantity?: number;
    unit?: string;
    batch_number?: string;
    expiry_date?: string; // String format MM-YYYY atau Date
    unit_price?: number;
    discount?: number; // Diskon sudah dalam angka, diproses oleh parseDiscountValue di server
    total_price?: number;
}

interface PaymentSummary {
    total_price?: number; // Nilai numerik sudah diproses oleh parseNumericValue di server
    vat?: number; // PPN sudah dalam bentuk numerik
    invoice_total?: number; // Total sudah dalam bentuk numerik
}

interface AdditionalInformation {
    checked_by?: string;
}

// Interface utama untuk data hasil ekstraksi
interface ExtractedInvoiceData {
    company_details?: CompanyDetails;
    invoice_information?: InvoiceInformation;
    customer_information?: CustomerInformation;
    product_list?: ProductListItem[];
    payment_summary?: PaymentSummary;
    additional_information?: AdditionalInformation;
    // Tambahkan properti lain jika ada dari Gemini
    rawText?: string; // Untuk fallback jika parsing JSON gagal
}

// Interface untuk struktur data MENTAH yang dikembalikan oleh API backend (Gemini)
interface RawInvoiceData {
    company?: {
        name?: string;
        address?: string;
        pbf_license_no?: number | string;
        dak_license_no?: number | string;
        cdob_certificate_no?: number | string;
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
    products?: Array<{ // Tipe ini akan digunakan oleh parameter 'p' dalam map
        sku?: string;
        product_name?: string;
        count?: number; // Perhatikan nama 'count' dari Gemini
        unit?: string;
        batch_no?: string; // Perhatikan nama 'batch_no' dari Gemini
        expiry_date?: string; // Format MM-YYYY
        price_per_unit?: string; // Format string "RpX.XXX"
        discount?: string; // Format string "-X%"
        total_price?: string; // Format string "RpX.XXX"
    }>;
    payment_summary?: {
        total_price?: string;
        vat?: string;
        total_invoice?: string;
    };
    additional_information?: {
        checked_by?: string;
    };
    rawText?: string; // Fallback dari backend
}

// --- Fungsi-fungsi Service ---

/**
 * Mengunggah gambar faktur dan mengekstrak datanya menggunakan API backend.
 * @param {File} file - File gambar faktur.
 * @returns {Promise<ExtractedInvoiceData>} Data hasil ekstraksi.
 * @throws {Error} Jika terjadi kesalahan saat mengunggah atau mengekstrak.
 */
export async function uploadAndExtractInvoice(file: File): Promise<ExtractedInvoiceData> {
    const formData = new FormData();
    formData.append('image', file);

    try {
        // Tentukan tipe data yang diharapkan dari response Axios (Gunakan RawInvoiceData)
        const response = await axios.post<RawInvoiceData>(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        // Validasi dasar respons (opsional tapi bagus)
        const responseData = response.data;
        if (!responseData || typeof responseData !== 'object') {
            throw new Error('Format respons tidak valid dari API ekstraksi.');
        }

        // Transformasi data dari format Gemini ke format yang diharapkan frontend
        const transformedData: ExtractedInvoiceData = {
            company_details: {
                name: responseData.company?.name, // Akses dari RawInvoiceData
                address: responseData.company?.address,
                license_pbf: responseData.company?.pbf_license_no?.toString(),
                license_dak: responseData.company?.dak_license_no?.toString(),
                certificate_cdob: responseData.company?.cdob_certificate_no?.toString()
            },
            invoice_information: {
                invoice_number: responseData.invoice?.number, // Akses dari RawInvoiceData
                invoice_date: responseData.invoice?.date,
                so_number: responseData.invoice?.so_number,
                due_date: responseData.invoice?.due_date
            },
            customer_information: {
                customer_name: responseData.customer?.name, // Akses dari RawInvoiceData
                customer_address: responseData.customer?.address
            },
            product_list: responseData.products?.map(p => { // Akses dari RawInvoiceData
                // Parsing harga dan total dari string "RpX.XXX" ke number
                const parseNumeric = (value?: string): number => {
                    if (!value) return 0;
                    return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                };
                // Parsing diskon dari string "-X%" ke number X
                const parseDiscount = (value?: string): number => {
                    if (!value) return 0;
                    return parseFloat(value.replace(/[^0-9.]/g, '')) || 0; // Hapus '-' dan '%'
                };
                return {
                    sku: p.sku,
                    product_name: p.product_name,
                    quantity: p.count, // Gunakan 'count' dari Gemini
                    unit: p.unit,
                    batch_number: p.batch_no, // Gunakan 'batch_no' dari Gemini
                    expiry_date: p.expiry_date, // Tetap string "MM-YYYY"
                    unit_price: parseNumeric(p.price_per_unit),
                    discount: parseDiscount(p.discount),
                    total_price: parseNumeric(p.total_price)
                };
            }),
            payment_summary: {
                total_price: parseFloat(responseData.payment_summary?.total_price ? responseData.payment_summary.total_price.replace(/[^\d,]/g, '').replace(',', '.') : '0') || 0, // Parsing dari string
                vat: parseFloat(responseData.payment_summary?.vat ? responseData.payment_summary.vat.replace(/[^\d,]/g, '').replace(',', '.') : '0') || 0, // Parsing dari string
                invoice_total: parseFloat(responseData.payment_summary?.total_invoice ? responseData.payment_summary.total_invoice.replace(/[^\d,]/g, '').replace(',', '.') : '0') || 0 // Parsing dari string
            },
            additional_information: {
                checked_by: responseData.additional_information?.checked_by
            }
        };

        return transformedData;

    } catch (error) {
        console.error('Error mengekstrak faktur:', error);
        let errorMessage = 'Gagal mengekstrak data faktur. Silakan coba lagi.';
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error?: string; details?: string }>;
            if (axiosError.response?.data?.error) {
                errorMessage = axiosError.response.data.error;
                if (axiosError.response.data.details) {
                    errorMessage += `: ${axiosError.response.data.details}`;
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

/**
 * Menyimpan data faktur hasil ekstraksi ke Supabase.
 * @param {ExtractedInvoiceData} extractedData - Data hasil ekstraksi dari Gemini.
 * @returns {Promise<{ id: string; success: boolean }>} Hasil operasi penyimpanan.
 * @throws {Error} Jika terjadi kesalahan saat menyimpan ke database.
 */
export async function saveInvoiceToDatabase(extractedData: ExtractedInvoiceData): Promise<{ id: string; success: boolean }> { // Tetap gunakan ExtractedInvoiceData di sini
    try { // Data yang diterima fungsi ini SUDAH ditransformasi
        // Validasi data penting sebelum insert
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


        // 1. Simpan header faktur ke e_invoices
        const { data: invoiceData, error: invoiceError } = await supabase
            .from('e_invoices')
            .insert({
                invoice_number: extractedData.invoice_information.invoice_number,
                invoice_date: extractedData.invoice_information.invoice_date, // Pastikan format tanggal sesuai DB
                so_number: extractedData.invoice_information.so_number,
                due_date: extractedData.invoice_information.due_date, // Pastikan format tanggal sesuai DB
                supplier_name: extractedData.company_details.name,
                supplier_address: extractedData.company_details.address,
                pbf_license_number: extractedData.company_details.license_pbf,
                dak_license_number: extractedData.company_details.license_dak,
                cdob_certificate_number: extractedData.company_details.certificate_cdob,
                customer_name: extractedData.customer_information.customer_name,
                customer_address: extractedData.customer_information.customer_address,
                total_price: extractedData.payment_summary?.total_price ?? 0,
                ppn: extractedData.payment_summary?.vat ?? 0,
                total_invoice: extractedData.payment_summary?.invoice_total ?? 0,
                checked_by: extractedData.additional_information?.checked_by,
                json_data: extractedData // Simpan raw data untuk audit/debug
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

        // 2. Simpan item faktur ke e_invoice_items
        const invoiceItems = (extractedData.product_list ?? []).map((product: ProductListItem) => ({
            invoice_id: invoiceData.id,
            sku: product.sku,
            product_name: product.product_name ?? 'Produk Tidak Dikenal',
            quantity: product.quantity ?? 0,
            unit: product.unit,
            batch_number: product.batch_number,
            expiry_date: product.expiry_date, // Biarkan string, trigger DB akan konversi jika formatnya MM-YYYY
            unit_price: product.unit_price ?? 0,
            discount: product.discount ?? 0,
            total_price: product.total_price ?? 0
        }));

        // Hanya insert jika ada item
        if (invoiceItems.length > 0) {
            const { error: itemsError } = await supabase
                .from('e_invoice_items')
                .insert(invoiceItems);

            if (itemsError) {
                console.error("Supabase items insert error:", itemsError);
                // Pertimbangkan: Haruskah kita rollback insert header jika item gagal?
                // Untuk saat ini, kita lempar error saja.
                throw new Error(`Gagal menyimpan item faktur: ${itemsError.message}`);
            }
        } else {
            console.warn(`Invoice ${invoiceData.id} disimpan tanpa item produk.`);
        }


        return { id: invoiceData.id, success: true };

    } catch (error: unknown) { // Tangkap error sebagai unknown
        console.error('Error menyimpan data faktur ke database:', error);
        // Pastikan kita melempar instance Error
        if (error instanceof Error) {
            throw new Error(`Gagal menyimpan faktur ke database: ${error.message}`);
        } else {
            throw new Error('Gagal menyimpan faktur ke database: Terjadi kesalahan tidak dikenal.');
        }
    }
}

/**
 * Proses lengkap: upload, ekstrak.
 * (Fungsi simpan dipanggil terpisah setelah konfirmasi pengguna)
 * @param {File} file - File gambar faktur.
 * @returns {Promise<ExtractedInvoiceData>} Data hasil ekstraksi.
 * @throws {Error} Jika terjadi kesalahan saat memproses.
 */
export async function processInvoice(file: File): Promise<ExtractedInvoiceData> {
    try {
        // Langkah 1: Upload dan ekstrak
        const extractedData = await uploadAndExtractInvoice(file);
        return extractedData; // Kembalikan data untuk konfirmasi
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