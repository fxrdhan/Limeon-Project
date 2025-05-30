import axios, { AxiosError } from 'axios';
import type { ExtractedInvoiceData } from '../types';

const API_URL = import.meta.env.VITE_INVOICE_EXTRACTOR_API_URL || 'http://localhost:3000/api/extract-invoice';

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

export async function regenerateInvoiceData(imageIdentifier: string): Promise<ExtractedInvoiceData> {
    try {
        const response = await axios.post<ExtractedInvoiceData>(`${API_URL.replace('/extract-invoice', '/regenerate-invoice')}`, { imageIdentifier });
        return response.data;
    } catch (error) {
        console.error("Error regenerating invoice data:", error);
        throw new Error('Gagal memproses ulang data faktur.');
    }
}

export async function saveInvoiceToDatabase(extractedData: ExtractedInvoiceData, imageIdentifier: string): Promise<{ message: string; success: boolean }> {
    try {
        if (!extractedData.invoice_information?.invoice_date) {
            throw new Error('Tanggal faktur tidak ditemukan dalam data ekstraksi.');
        }
        if (!extractedData.company_details?.name) {
            throw new Error('Nama supplier tidak ditemukan dalam data ekstraksi.');
        }
        if (!extractedData.customer_information?.customer_name) {
            throw new Error('Nama pelanggan tidak ditemukan dalam data ekstraksi.');
        }

        const response = await axios.post(`${API_URL.replace('/extract-invoice', '/confirm-invoice')}`, {
            invoiceData: extractedData,
            imageIdentifier: imageIdentifier
        });

        return { message: response.data.message || "Faktur berhasil dikonfirmasi", success: true };
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