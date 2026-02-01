import { describe, it, expect } from 'vitest';
import { useInvoiceUploadStore } from './invoiceUploadStore';

describe('invoiceUploadStore', () => {
  it('sets and clears cached invoice file', () => {
    const file = new File([new Uint8Array(10)], 'invoice.pdf', {
      type: 'application/pdf',
    });

    useInvoiceUploadStore.getState().setCachedInvoiceFile(file);
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBe(file);

    useInvoiceUploadStore.getState().clearCachedInvoiceFile();
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBeNull();
  });
});
