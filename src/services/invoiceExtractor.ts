import axios, { AxiosError } from 'axios';
import type { ExtractedInvoiceData } from '../types';

// Supabase Edge Functions configuration
const API_BASE_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Common headers for Supabase Edge Functions
const getHeaders = (contentType?: string) => ({
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
  ...(contentType && { 'Content-Type': contentType }),
});

// API endpoints
const ENDPOINTS = {
  EXTRACT: `${API_BASE_URL}/extract-invoice`,
  REGENERATE: `${API_BASE_URL}/regenerate-invoice`,
  CONFIRM: `${API_BASE_URL}/confirm-invoice`,
};

export async function uploadAndExtractInvoice(
  file: File
): Promise<ExtractedInvoiceData> {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await axios.post<ExtractedInvoiceData>(
      ENDPOINTS.EXTRACT,
      formData,
      {
        headers: {
          ...getHeaders('multipart/form-data'),
        },
      }
    );

    const responseData = response.data;
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Format respons tidak valid dari API ekstraksi.');
    }
    return responseData;
  } catch (error: unknown) {
    console.error('Error details:', error);
    let errorMessage = 'Gagal mengekstrak data faktur. Silakan coba lagi.';
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<
        { error?: string; details?: string } | string
      >;
      console.error('Axios error status:', axiosError.status);
      console.error('Axios error response:', axiosError.response?.data);
      console.error('Axios error request config:', axiosError.config);

      if (
        typeof axiosError.response?.data === 'object' &&
        axiosError.response.data !== null &&
        'error' in axiosError.response.data
      ) {
        errorMessage = (axiosError.response.data as { error: string }).error;
        if (
          'details' in axiosError.response.data &&
          (axiosError.response.data as { details: string }).details
        ) {
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

export async function regenerateInvoiceData(
  imageIdentifier: string
): Promise<ExtractedInvoiceData> {
  try {
    const response = await axios.post<ExtractedInvoiceData>(
      ENDPOINTS.REGENERATE,
      { imageIdentifier },
      {
        headers: getHeaders('application/json'),
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error regenerating invoice data:', error);
    throw new Error('Gagal memproses ulang data faktur.');
  }
}

export async function saveInvoiceToDatabase(
  extractedData: ExtractedInvoiceData,
  imageIdentifier: string
): Promise<{ message: string; success: boolean }> {
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

    const response = await axios.post(
      ENDPOINTS.CONFIRM,
      {
        invoiceData: extractedData,
        imageIdentifier: imageIdentifier,
      },
      {
        headers: getHeaders('application/json'),
      }
    );

    return {
      message: response.data.message || 'Faktur berhasil dikonfirmasi',
      success: true,
    };
  } catch (error: unknown) {
    console.error('Error menyimpan data faktur ke database:', error);
    if (error instanceof Error) {
      throw new Error(`Gagal menyimpan faktur ke database: ${error.message}`);
    } else {
      throw new Error(
        'Gagal menyimpan faktur ke database: Terjadi kesalahan tidak dikenal.'
      );
    }
  }
}

export async function processInvoice(
  file: File
): Promise<ExtractedInvoiceData> {
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
