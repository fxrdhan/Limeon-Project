import { create } from 'zustand';

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
