import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadInvoicePortal from './UploadInvoicePortal';

const navigateMock = vi.hoisted(() => vi.fn());
const uploadAndExtractInvoiceMock = vi.hoisted(() => vi.fn());
const setCachedInvoiceFileMock = vi.hoisted(() => vi.fn());
const clearCachedInvoiceFileMock = vi.hoisted(() => vi.fn());
const storeState = vi.hoisted(
  () =>
    ({
      cachedInvoiceFile: null as File | null,
    }) as { cachedInvoiceFile: File | null }
);

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/services/invoiceExtractor', () => ({
  uploadAndExtractInvoice: uploadAndExtractInvoiceMock,
}));

vi.mock('@/store/invoiceUploadStore', () => ({
  useInvoiceUploadStore: () => ({
    cachedInvoiceFile: storeState.cachedInvoiceFile,
    setCachedInvoiceFile: setCachedInvoiceFileMock,
    clearCachedInvoiceFile: clearCachedInvoiceFileMock,
  }),
}));

vi.mock('motion/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef<HTMLElement, Record<string, unknown>>(
      ({ children, ...props }, ref) =>
        React.createElement(tag, { ...props, ref }, children)
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    motion: new Proxy(
      {},
      {
        get: (_, tag) => createMotionComponent(String(tag)),
      }
    ),
  };
});

describe('UploadInvoicePortal', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    uploadAndExtractInvoiceMock.mockReset();
    setCachedInvoiceFileMock.mockReset();
    clearCachedInvoiceFileMock.mockReset();
    storeState.cachedInvoiceFile = null;

    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:https://pharmasys.test/invoice-preview'
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('renders nothing when portal is closed', () => {
    const { container } = render(
      <UploadInvoicePortal isOpen={false} onClose={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows invalid file type error', async () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const fileInput = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();

    const invalidTypeFile = new File(['hello'], 'invoice.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput!, {
      target: { files: [invalidTypeFile] },
    });
    expect(
      await screen.findByText(
        'Tipe file tidak valid. Harap unggah file PNG atau JPG.'
      )
    ).toBeInTheDocument();
  });

  it('accepts valid file and removes it', async () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const fileInput = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();

    const validFile = new File(['image-content'], 'invoice.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(fileInput!, {
      target: { files: [validFile] },
    });

    expect(await screen.findByText('invoice.jpg')).toBeInTheDocument();
    expect(setCachedInvoiceFileMock).toHaveBeenCalledWith(validFile);

    fireEvent.click(screen.getByRole('button', { name: 'Hapus file' }));

    expect(clearCachedInvoiceFileMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Klik atau seret untuk mengunggah gambar faktur')
    ).toBeInTheDocument();
  });

  it('uploads valid invoice and navigates to confirmation page with extracted payload', async () => {
    const onClose = vi.fn();
    const extractedResult = {
      imageIdentifier: 'img_123',
      supplier: 'PT Farmasi',
      items: [{ name: 'Paracetamol', qty: 10 }],
    };
    uploadAndExtractInvoiceMock.mockResolvedValue(extractedResult);

    render(<UploadInvoicePortal isOpen onClose={onClose} />);

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const validFile = new File(['valid-image'], 'invoice.png', {
      type: 'image/png',
    });
    fireEvent.change(input!, { target: { files: [validFile] } });

    fireEvent.click(screen.getByRole('button', { name: /Ekspor Data/i }));

    await waitFor(() => {
      expect(uploadAndExtractInvoiceMock).toHaveBeenCalledWith(validFile);
    });

    expect(clearCachedInvoiceFileMock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/purchases/confirm-invoice', {
      state: expect.objectContaining({
        extractedData: extractedResult,
        imageIdentifier: 'img_123',
        filePreview: 'blob:https://pharmasys.test/invoice-preview',
      }),
    });
  });

  it('shows upload failure message and supports preview zoom controls', async () => {
    uploadAndExtractInvoiceMock.mockRejectedValue(new Error('OCR timeout'));

    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const uploadArea = screen
      .getByText('Klik atau seret untuk mengunggah gambar faktur')
      .closest('div');
    expect(uploadArea).toBeTruthy();
    const oversizedDroppedFile = {
      name: 'dropped-large.jpg',
      type: 'image/jpeg',
      size: 6 * 1024 * 1024,
    } as File;
    fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [oversizedDroppedFile] },
    });
    expect(
      await screen.findByText('Ukuran file terlalu besar. Maksimum 5MB.')
    ).toBeInTheDocument();

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const validFile = new File(['img'], 'invoice-zoom.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(input!, { target: { files: [validFile] } });

    const fileRow = screen.getByText('invoice-zoom.jpg').closest('div');
    expect(fileRow).toBeTruthy();
    fireEvent.click(fileRow!);

    const previewImage = await screen.findByAltText('Preview');
    const previewOverlay = previewImage.closest('.fixed.inset-0');
    expect(previewOverlay).toBeTruthy();

    const zoomBadge = screen.getByText('100%').closest('div');
    expect(zoomBadge).toBeTruthy();
    const zoomContainer = zoomBadge!.parentElement;
    expect(zoomContainer).toBeTruthy();
    fireEvent.wheel(zoomContainer!, { deltaY: 100 });
    expect(await screen.findByText('110%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ekspor Data/i }));
    expect(
      await screen.findByText(/Gagal mengunggah dan mengekstrak faktur/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/OCR timeout/)).toBeInTheDocument();
  });
});
