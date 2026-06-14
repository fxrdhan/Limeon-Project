import { create } from 'zustand';
import { registerBrowserLogoutCleanupContributor } from '@/lib/browserLogoutCleanupRegistry';

interface InvoiceUploadState {
  cachedInvoiceFile: File | null;
  setCachedInvoiceFile: (file: File | null) => void;
  clearCachedInvoiceFile: () => void;
}

export const useInvoiceUploadStore = create<InvoiceUploadState>(set => ({
  cachedInvoiceFile: null,
  setCachedInvoiceFile: file => set({ cachedInvoiceFile: file }),
  clearCachedInvoiceFile: () => set({ cachedInvoiceFile: null }),
}));

registerBrowserLogoutCleanupContributor({
  id: 'invoice-upload-store',
  resetRuntimeState: () => {
    useInvoiceUploadStore.getState().clearCachedInvoiceFile();
  },
});
