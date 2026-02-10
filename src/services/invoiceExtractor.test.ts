import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());
const isAxiosErrorMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    post: postMock,
    isAxiosError: isAxiosErrorMock,
  },
  post: postMock,
  isAxiosError: isAxiosErrorMock,
}));

const importModule = async () => {
  vi.resetModules();
  return await import('./invoiceExtractor');
};

const createValidExtractedData = () =>
  ({
    invoice_information: { invoice_date: '2026-01-01' },
    company_details: { name: 'Supplier A' },
    customer_information: { customer_name: 'Customer A' },
    items: [],
  }) as never;

describe('invoiceExtractor', () => {
  beforeEach(() => {
    postMock.mockReset();
    isAxiosErrorMock.mockReset();
    isAxiosErrorMock.mockReturnValue(false);
    vi.stubEnv('VITE_SUPABASE_FUNCTIONS_URL', 'https://functions.example.com');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uploads and extracts invoice successfully', async () => {
    const { uploadAndExtractInvoice } = await importModule();
    const data = createValidExtractedData();
    postMock.mockResolvedValueOnce({ data });

    const file = new File(['file'], 'invoice.jpg', { type: 'image/jpeg' });
    const result = await uploadAndExtractInvoice(file);

    expect(result).toEqual(data);
    expect(postMock).toHaveBeenCalledWith(
      'https://functions.example.com/extract-invoice',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer anon-key',
          apikey: 'anon-key',
          'Content-Type': 'multipart/form-data',
        }),
      })
    );
  });

  it('throws when extract response format is invalid', async () => {
    const { uploadAndExtractInvoice } = await importModule();
    postMock.mockResolvedValueOnce({ data: null });

    const file = new File(['file'], 'invoice.jpg', { type: 'image/jpeg' });

    await expect(uploadAndExtractInvoice(file)).rejects.toThrow(
      'Format respons tidak valid dari API ekstraksi.'
    );
  });

  it('uses axios error payload message and details', async () => {
    const { uploadAndExtractInvoice } = await importModule();
    const error = {
      message: 'request failed',
      status: 400,
      response: { data: { error: 'API gagal', details: 'timeout' } },
      config: { method: 'post' },
    };
    isAxiosErrorMock.mockReturnValue(true);
    postMock.mockRejectedValueOnce(error);

    const file = new File(['file'], 'invoice.jpg', { type: 'image/jpeg' });

    await expect(uploadAndExtractInvoice(file)).rejects.toThrow(
      'API gagal: timeout'
    );
  });

  it('falls back to axios message when response payload is not object', async () => {
    const { uploadAndExtractInvoice } = await importModule();
    const error = {
      message: 'network disconnected',
      response: { data: 'bad response' },
      config: {},
    };
    isAxiosErrorMock.mockReturnValue(true);
    postMock.mockRejectedValueOnce(error);

    const file = new File(['file'], 'invoice.jpg', { type: 'image/jpeg' });

    await expect(uploadAndExtractInvoice(file)).rejects.toThrow(
      'network disconnected'
    );
  });

  it('regenerates invoice data and handles errors', async () => {
    const { regenerateInvoiceData } = await importModule();
    const data = createValidExtractedData();
    postMock.mockResolvedValueOnce({ data });

    await expect(regenerateInvoiceData('img-1')).resolves.toEqual(data);
    expect(postMock).toHaveBeenCalledWith(
      'https://functions.example.com/regenerate-invoice',
      { imageIdentifier: 'img-1' },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer anon-key',
          apikey: 'anon-key',
          'Content-Type': 'application/json',
        }),
      })
    );

    postMock.mockRejectedValueOnce(new Error('boom'));
    await expect(regenerateInvoiceData('img-2')).rejects.toThrow(
      'Gagal memproses ulang data faktur.'
    );
  });

  it('validates required fields before saving invoice', async () => {
    const { saveInvoiceToDatabase } = await importModule();

    await expect(
      saveInvoiceToDatabase(
        {
          company_details: { name: 'x' },
          customer_information: { customer_name: 'y' },
        } as never,
        'img-1'
      )
    ).rejects.toThrow('Tanggal faktur tidak ditemukan dalam data ekstraksi.');

    await expect(
      saveInvoiceToDatabase(
        {
          invoice_information: { invoice_date: '2026-01-01' },
          customer_information: { customer_name: 'y' },
        } as never,
        'img-1'
      )
    ).rejects.toThrow('Nama supplier tidak ditemukan dalam data ekstraksi.');

    await expect(
      saveInvoiceToDatabase(
        {
          invoice_information: { invoice_date: '2026-01-01' },
          company_details: { name: 'x' },
        } as never,
        'img-1'
      )
    ).rejects.toThrow('Nama pelanggan tidak ditemukan dalam data ekstraksi.');
  });

  it('saves invoice and uses default success message when message is missing', async () => {
    const { saveInvoiceToDatabase } = await importModule();
    const extractedData = createValidExtractedData();
    postMock.mockResolvedValueOnce({ data: {} });

    await expect(
      saveInvoiceToDatabase(extractedData, 'img-1')
    ).resolves.toEqual({
      message: 'Faktur berhasil dikonfirmasi',
      success: true,
    });
  });

  it('wraps unknown save errors', async () => {
    const { saveInvoiceToDatabase } = await importModule();
    const extractedData = createValidExtractedData();
    postMock.mockRejectedValueOnce('unexpected');

    await expect(saveInvoiceToDatabase(extractedData, 'img-1')).rejects.toThrow(
      'Gagal menyimpan faktur ke database: Terjadi kesalahan tidak dikenal.'
    );
  });

  it('processes invoice and forwards error messages', async () => {
    const { processInvoice } = await importModule();
    const data = createValidExtractedData();
    postMock.mockResolvedValueOnce({ data });

    const file = new File(['file'], 'invoice.jpg', { type: 'image/jpeg' });
    await expect(processInvoice(file)).resolves.toEqual(data);

    postMock.mockRejectedValueOnce(new Error('Custom extractor error'));
    await expect(processInvoice(file)).rejects.toThrow(
      'Custom extractor error'
    );

    postMock.mockRejectedValueOnce('not-an-error-instance');
    await expect(processInvoice(file)).rejects.toThrow(
      'Gagal mengekstrak data faktur. Silakan coba lagi.'
    );
  });
});
