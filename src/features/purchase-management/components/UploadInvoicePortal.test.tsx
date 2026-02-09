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

  it('loads cached file, falls back when preview URL is unsafe, and supports touch remove', async () => {
    const cachedFile = new File(['cached-image'], 'cached-invoice.jpg', {
      type: 'image/jpeg',
    });
    storeState.cachedInvoiceFile = cachedFile;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'https://pharmasys.test/not-blob-url'
    );

    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText('cached-invoice.jpg')).toBeInTheDocument();
    expect(screen.queryByAltText('Thumbnail')).not.toBeInTheDocument();

    const fileRow = screen.getByText('cached-invoice.jpg').closest('div');
    expect(fileRow).toBeTruthy();
    fireEvent.touchEnd(fileRow!);
    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: 'Hapus file' });
    fireEvent.touchStart(removeButton);
    fireEvent.touchEnd(removeButton);
    expect(clearCachedInvoiceFileMock).toHaveBeenCalled();
  });

  it('handles drag/drop edge cases without crashing', () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const uploadArea = document.querySelector(
      'div[class*="border-2"]'
    ) as HTMLDivElement | null;
    expect(uploadArea).toBeTruthy();

    fireEvent.dragOver(uploadArea!);
    fireEvent.dragLeave(uploadArea!);
    fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [] },
    });
    expect(uploadArea?.className).toContain('border-2');
  });

  it('closes preview and portal overlays from backdrop clicks', async () => {
    const onClose = vi.fn();
    render(<UploadInvoicePortal isOpen onClose={onClose} />);

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const validFile = new File(['overlay'], 'overlay.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(input!, { target: { files: [validFile] } });

    const fileRow = screen.getByText('overlay.jpg').closest('div');
    expect(fileRow).toBeTruthy();
    fireEvent.click(fileRow!);

    const previewImage = await screen.findByAltText('Preview');
    const previewOverlay = Array.from(
      document.querySelectorAll<HTMLDivElement>('.fixed.inset-0')
    ).find(node => node.className.includes('bg-black/70'));
    expect(previewOverlay).toBeTruthy();
    fireEvent.mouseMove(previewImage.parentElement || previewImage, {
      clientX: 24,
      clientY: 30,
    });

    const baseOverlay = Array.from(
      document.querySelectorAll<HTMLDivElement>('.fixed.inset-0')
    ).find(node => node.className.includes('bg-black/50'));
    expect(baseOverlay).toBeTruthy();
    fireEvent.click(baseOverlay!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes full preview on preview-backdrop click and resets preview state', async () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    if (!input) return;

    const file = new File(['preview'], 'preview-close.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(input, { target: { files: [file] } });

    const fileRow = screen.getByText('preview-close.jpg').closest('div');
    expect(fileRow).toBeTruthy();
    if (!fileRow) return;

    fireEvent.click(fileRow);
    expect(await screen.findByAltText('Preview')).toBeInTheDocument();

    const previewOverlay = Array.from(
      document.querySelectorAll<HTMLDivElement>('.fixed.inset-0')
    ).find(node => node.className.includes('bg-black/70'));
    expect(previewOverlay).toBeTruthy();
    if (!previewOverlay) return;

    fireEvent.click(previewOverlay);
    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('keeps preview closed when remove button interaction starts and removes file', async () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    if (!input) return;

    const file = new File(['remove'], 'remove-target.jpg', {
      type: 'image/jpeg',
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('remove-target.jpg')).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: 'Hapus file' });
    fireEvent.mouseDown(removeButton);
    fireEvent.touchStart(removeButton);
    fireEvent.click(removeButton);

    expect(clearCachedInvoiceFileMock).toHaveBeenCalled();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('handles uploader hover transitions and upload-box click to file input', () => {
    render(<UploadInvoicePortal isOpen onClose={vi.fn()} />);

    const uploadText = screen.getByText(
      'Klik atau seret untuk mengunggah gambar faktur'
    );
    const uploadBox = uploadText.closest('div[class*="border-2"]');
    expect(uploadBox).toBeTruthy();

    const input = document.querySelector(
      '#fileInput'
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    if (!uploadBox || !input) return;

    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.mouseMove(uploadBox, { clientX: 20, clientY: 20 });
    expect(uploadText).toBeInTheDocument();

    fireEvent.mouseLeave(uploadBox, { clientX: -20, clientY: -20 });
    fireEvent.click(uploadBox);
    expect(clickSpy).toHaveBeenCalled();
  });
});
