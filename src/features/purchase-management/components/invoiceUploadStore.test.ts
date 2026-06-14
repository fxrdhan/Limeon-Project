import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { getBrowserLogoutCleanupContributors } from '../../../lib/browserLogoutCleanupRegistry';
import { useInvoiceUploadStore } from './invoiceUploadStore';

describe('invoiceUploadStore', () => {
  beforeEach(() => {
    useInvoiceUploadStore.getState().clearCachedInvoiceFile();
  });

  it('registers logout cleanup for the cached invoice file', () => {
    const invoiceFile = new File(['invoice'], 'invoice.png', {
      type: 'image/png',
    });
    const invoiceUploadContributor = getBrowserLogoutCleanupContributors().find(
      contributor => contributor.id === 'invoice-upload-store'
    );

    useInvoiceUploadStore.getState().setCachedInvoiceFile(invoiceFile);
    invoiceUploadContributor?.resetRuntimeState?.();

    expect(invoiceUploadContributor).toBeDefined();
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBeNull();
  });
});
