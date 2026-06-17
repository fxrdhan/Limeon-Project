import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useUploadInvoicePortal } from './useUploadInvoicePortal';
import type { ChangeEvent } from 'react';
import { useInvoiceUploadStore } from './invoiceUploadStore';
import type { ExtractedInvoiceData } from '../../../../types';

const { navigateMock, uploadAndExtractInvoiceMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  uploadAndExtractInvoiceMock: vi.fn(),
}));

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/services/invoiceExtractor', () => ({
  uploadAndExtractInvoice: uploadAndExtractInvoiceMock,
}));

const createObjectURLDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL'
);
const revokeObjectURLDescriptor = Object.getOwnPropertyDescriptor(
  URL,
  'revokeObjectURL'
);

const invoiceImage = () =>
  new File(['invoice'], 'invoice.png', { type: 'image/png' });

const changeEvent = (file: File | null): ChangeEvent<HTMLInputElement> => {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: file ? [file] : [],
  });

  return {
    currentTarget: input,
    target: input,
  } as ChangeEvent<HTMLInputElement>;
};

const extractedInvoice: ExtractedInvoiceData = {
  company_details: {
    name: 'PT Supplier',
  },
  customer_information: {
    customer_name: 'PharmaSys',
  },
  imageIdentifier: 'invoice-image-1',
  invoice_information: {
    invoice_number: 'INV-001',
  },
  product_list: [],
};

const createDeferredInvoiceExtraction = () => {
  let resolveInvoice:
    | ((
        value: ExtractedInvoiceData | PromiseLike<ExtractedInvoiceData>
      ) => void)
    | null = null;
  const promise = new Promise<ExtractedInvoiceData>(resolve => {
    resolveInvoice = resolve;
  });

  return {
    promise,
    resolveInvoice: (value: ExtractedInvoiceData) => {
      resolveInvoice?.(value);
    },
  };
};

describe('useUploadInvoicePortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInvoiceUploadStore.getState().clearCachedInvoiceFile();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:invoice-preview'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      callback(0);
      return 1;
    }) as typeof requestAnimationFrame);
  });

  afterEach(() => {
    useInvoiceUploadStore.getState().clearCachedInvoiceFile();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    if (createObjectURLDescriptor) {
      Object.defineProperty(URL, 'createObjectURL', createObjectURLDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }

    if (revokeObjectURLDescriptor) {
      Object.defineProperty(URL, 'revokeObjectURL', revokeObjectURLDescriptor);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  it('caches a selected valid image and clears it when removed', async () => {
    const file = invoiceImage();
    const { result } = renderHook(() =>
      useUploadInvoicePortal({ isOpen: true, onClose: vi.fn() })
    );

    act(() => {
      result.current.uploadDialogPortalProps.onFileChange(changeEvent(file));
    });

    await waitFor(() => {
      expect(result.current.uploadDialogPortalProps.previewUrl).toBe(
        'blob:invoice-preview'
      );
    });

    expect(result.current.uploadDialogPortalProps.file).toBe(file);
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBe(file);

    act(() => {
      result.current.uploadDialogPortalProps.onRemoveFile();
    });

    expect(result.current.uploadDialogPortalProps.file).toBeNull();
    expect(result.current.uploadDialogPortalProps.previewUrl).toBeNull();
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBeNull();
  });

  it('rejects unsupported selected files without caching them', () => {
    const { result } = renderHook(() =>
      useUploadInvoicePortal({ isOpen: true, onClose: vi.fn() })
    );

    act(() => {
      result.current.uploadDialogPortalProps.onFileChange(
        changeEvent(
          new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' })
        )
      );
    });

    expect(result.current.uploadDialogPortalProps.error).toBe(
      'Tipe file tidak valid. Harap unggah file PNG atau JPG.'
    );
    expect(result.current.uploadDialogPortalProps.file).toBeNull();
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBeNull();
  });

  it('does not start upload when no invoice image is selected', async () => {
    const { result } = renderHook(() =>
      useUploadInvoicePortal({ isOpen: true, onClose: vi.fn() })
    );

    await act(async () => {
      await result.current.uploadDialogPortalProps.onUpload();
    });

    expect(uploadAndExtractInvoiceMock).not.toHaveBeenCalled();
    expect(result.current.uploadDialogPortalProps.error).toBe(
      'Pilih file faktur terlebih dahulu.'
    );
  });

  it('resets transient upload state when the portal closes', async () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useUploadInvoicePortal({ isOpen, onClose: vi.fn() }),
      {
        initialProps: { isOpen: true },
      }
    );

    act(() => {
      result.current.uploadDialogPortalProps.onFileChange(
        changeEvent(invoiceImage())
      );
    });

    await waitFor(() => {
      expect(result.current.uploadDialogPortalProps.file).not.toBeNull();
    });

    rerender({ isOpen: false });

    expect(result.current.uploadDialogPortalProps.error).toBeNull();
    expect(result.current.uploadDialogPortalProps.file).toBeNull();
    expect(result.current.uploadDialogPortalProps.isDragging).toBe(false);
    expect(result.current.fullPreviewPortalProps.showFullPreview).toBe(false);
    expect(result.current.fullPreviewPortalProps.zoomLevel).toBe(1);
  });

  it('cancels pending uploader glow animation frames on unmount', () => {
    const scheduledFrames = new Map<number, FrameRequestCallback>();
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      scheduledFrames.delete(frameId);
    });
    let nextFrameId = 1;

    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      scheduledFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const { result, unmount } = renderHook(() =>
      useUploadInvoicePortal({ isOpen: true, onClose: vi.fn() })
    );

    act(() => {
      result.current.uploadDialogPortalProps.onUploaderMouseEnter();
    });

    expect(scheduledFrames.size).toBe(1);

    unmount();

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(1);
    expect(scheduledFrames.size).toBe(0);
  });

  it('uploads the selected file and navigates with extracted invoice data', async () => {
    const onClose = vi.fn();
    const file = invoiceImage();
    uploadAndExtractInvoiceMock.mockResolvedValue(extractedInvoice);
    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(2_350);

    const { result } = renderHook(() =>
      useUploadInvoicePortal({ isOpen: true, onClose })
    );

    act(() => {
      result.current.uploadDialogPortalProps.onFileChange(changeEvent(file));
    });

    await waitFor(() => {
      expect(result.current.uploadDialogPortalProps.previewUrl).toBe(
        'blob:invoice-preview'
      );
    });

    await act(async () => {
      await result.current.uploadDialogPortalProps.onUpload();
    });

    expect(uploadAndExtractInvoiceMock).toHaveBeenCalledWith(file);
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/purchases/confirm-invoice', {
      state: {
        extractedData: extractedInvoice,
        filePreview: 'blob:invoice-preview',
        imageIdentifier: 'invoice-image-1',
        processingTime: '1.4',
      },
    });
  });

  it('ignores invoice extraction completion after the portal closes', async () => {
    const onClose = vi.fn();
    const file = invoiceImage();
    const deferredExtraction = createDeferredInvoiceExtraction();
    uploadAndExtractInvoiceMock.mockReturnValue(deferredExtraction.promise);

    const { result, rerender } = renderHook(
      ({ isOpen }) => useUploadInvoicePortal({ isOpen, onClose }),
      {
        initialProps: { isOpen: true },
      }
    );

    act(() => {
      result.current.uploadDialogPortalProps.onFileChange(changeEvent(file));
    });

    await waitFor(() => {
      expect(result.current.uploadDialogPortalProps.previewUrl).toBe(
        'blob:invoice-preview'
      );
    });

    let uploadPromise = Promise.resolve();
    act(() => {
      uploadPromise = result.current.uploadDialogPortalProps.onUpload();
    });

    expect(result.current.uploadDialogPortalProps.loading).toBe(true);

    rerender({ isOpen: false });

    expect(result.current.uploadDialogPortalProps.loading).toBe(false);

    await act(async () => {
      deferredExtraction.resolveInvoice(extractedInvoice);
      await uploadPromise;
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(useInvoiceUploadStore.getState().cachedInvoiceFile).toBe(file);
    expect(result.current.uploadDialogPortalProps.error).toBeNull();
    expect(result.current.uploadDialogPortalProps.loading).toBe(false);
  });
});
