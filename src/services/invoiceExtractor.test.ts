import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { uploadAndExtractInvoice } from './invoiceExtractor';

const { mockIsAxiosError, mockPost } = vi.hoisted(() => ({
  mockIsAxiosError: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    isAxiosError: mockIsAxiosError,
    post: mockPost,
  },
}));

const invoiceFile = () =>
  new File(['invoice'], 'invoice.png', { type: 'image/png' });

const createAxiosError = (
  message: string,
  data?: { error?: unknown; details?: unknown } | string
) => ({
  config: { url: 'https://functions.test/extract-invoice' },
  isAxiosError: true,
  message,
  response: data === undefined ? undefined : { data },
  status: 500,
});

describe('invoiceExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIsAxiosError.mockImplementation(
      error =>
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        error.isAxiosError === true
    );
  });

  it('uses structured extraction error details from Axios responses', async () => {
    mockPost.mockRejectedValue(
      createAxiosError('Request failed', {
        details: 'OCR timeout',
        error: 'API ekstraksi gagal',
      })
    );

    await expect(uploadAndExtractInvoice(invoiceFile())).rejects.toThrow(
      'API ekstraksi gagal: OCR timeout'
    );
  });

  it('uses structured extraction error messages without details', async () => {
    mockPost.mockRejectedValue(
      createAxiosError('Request failed', {
        error: 'API ekstraksi gagal',
      })
    );

    await expect(uploadAndExtractInvoice(invoiceFile())).rejects.toThrow(
      'API ekstraksi gagal'
    );
  });

  it('falls back to Axios messages for malformed response payloads', async () => {
    mockPost.mockRejectedValue(
      createAxiosError('Request failed with status code 500', {
        error: 500,
      })
    );

    await expect(uploadAndExtractInvoice(invoiceFile())).rejects.toThrow(
      'Request failed with status code 500'
    );
  });
});
