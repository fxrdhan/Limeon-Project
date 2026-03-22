import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { useComposerAttachmentPreview } from '../hooks/useComposerAttachmentPreview';
import type { PendingComposerAttachment } from '../types';

const { mockOpenDocumentPreview, mockCloseDocumentPreview } = vi.hoisted(
  () => ({
    mockOpenDocumentPreview: vi.fn().mockResolvedValue(true),
    mockCloseDocumentPreview: vi.fn(),
  })
);

vi.mock('../hooks/useDocumentPreviewPortal', () => ({
  useDocumentPreviewPortal: () => ({
    previewUrl: null,
    previewName: '',
    isPreviewVisible: false,
    closeDocumentPreview: mockCloseDocumentPreview,
    openDocumentPreview: mockOpenDocumentPreview,
  }),
}));

const buildAttachment = (
  overrides: Partial<PendingComposerAttachment> = {}
): PendingComposerAttachment => ({
  id: overrides.id ?? 'attachment-1',
  file:
    overrides.file ?? new File(['image'], 'foto.png', { type: 'image/png' }),
  fileName: overrides.fileName ?? 'foto.png',
  fileTypeLabel: overrides.fileTypeLabel ?? 'PNG',
  fileKind: overrides.fileKind ?? 'image',
  mimeType: overrides.mimeType ?? 'image/png',
  previewUrl: overrides.previewUrl ?? 'blob:preview',
  pdfCoverUrl: overrides.pdfCoverUrl ?? null,
  pdfPageCount: overrides.pdfPageCount ?? null,
});

const ComposerAttachmentPreviewHarness = ({
  attachment,
  onOpenImageActionsMenu = vi.fn(),
  onOpenComposerImagePreview = vi.fn<(attachmentId: string) => void>(),
  onCompressPendingComposerPdf = vi.fn().mockResolvedValue(true),
}: {
  attachment: PendingComposerAttachment;
  onOpenImageActionsMenu?: () => void;
  onOpenComposerImagePreview?: (attachmentId: string) => void;
  onCompressPendingComposerPdf?: (
    attachmentId: string,
    compressionLevel?: 'low' | 'recommended' | 'extreme'
  ) => Promise<boolean>;
}) => {
  const preview = useComposerAttachmentPreview({
    pendingComposerAttachments: [attachment],
    onOpenImageActionsMenu,
    onAttachImageClick: vi.fn(),
    onAttachDocumentClick: vi.fn(),
    onCompressPendingComposerImage: vi.fn().mockResolvedValue(true),
    onCompressPendingComposerPdf,
    onRemovePendingComposerAttachment: vi.fn(),
    onOpenComposerImagePreview,
  });

  return (
    <div>
      <button
        type="button"
        ref={preview.imageActionsButtonRef}
        onClick={event =>
          preview.handleToggleImageActionsMenu(event, attachment.id)
        }
      >
        toggle
      </button>
      <span data-testid="open-id">
        {preview.openImageActionsAttachmentId ?? ''}
      </span>
      <span data-testid="menu-position">
        {preview.imageActionsMenuPosition ? 'open' : 'closed'}
      </span>
      <span data-testid="compression-menu-position">
        {preview.pdfCompressionMenuPosition ? 'open' : 'closed'}
      </span>
      {preview.imageActions.map(action => (
        <button key={action.label} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ))}
      {preview.pdfCompressionLevelActions.map(action => (
        <button key={action.label} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  );
};

describe('useComposerAttachmentPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the composer menu open when opening an image preview', () => {
    const onOpenImageActionsMenu = vi.fn();
    const onOpenComposerImagePreview = vi.fn();

    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment()}
        onOpenImageActionsMenu={onOpenImageActionsMenu}
        onOpenComposerImagePreview={onOpenComposerImagePreview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka' }));

    expect(onOpenImageActionsMenu).toHaveBeenCalledOnce();
    expect(onOpenComposerImagePreview).toHaveBeenCalledWith('attachment-1');
    expect(screen.getByTestId('open-id').textContent).toBe('attachment-1');
    expect(screen.getByTestId('menu-position').textContent).toBe('open');
    expect(screen.getByRole('button', { name: 'Buka' })).toBeTruthy();
  });

  it('keeps the composer menu open when opening a document preview', () => {
    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment({
          id: 'attachment-2',
          file: new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
          fileName: 'stok.pdf',
          fileTypeLabel: 'PDF',
          fileKind: 'document',
          mimeType: 'application/pdf',
          previewUrl: null,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buka' }));

    expect(mockOpenDocumentPreview).toHaveBeenCalledOnce();
    expect(screen.getByTestId('open-id').textContent).toBe('attachment-2');
    expect(screen.getByTestId('menu-position').textContent).toBe('open');
    expect(screen.getByRole('button', { name: 'Buka' })).toBeTruthy();
  });

  it('shows a compress action for pending PDF documents', () => {
    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment({
          id: 'attachment-3',
          file: new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
          fileName: 'stok.pdf',
          fileTypeLabel: 'PDF',
          fileKind: 'document',
          mimeType: 'application/pdf',
          previewUrl: null,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.getByRole('button', { name: 'Kompres' })).toBeTruthy();
  });

  it('opens the pdf compression levels menu before compressing', () => {
    const onCompressPendingComposerPdf = vi.fn().mockResolvedValue(true);

    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment({
          id: 'attachment-3',
          file: new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
          fileName: 'stok.pdf',
          fileTypeLabel: 'PDF',
          fileKind: 'document',
          mimeType: 'application/pdf',
          previewUrl: null,
        })}
        onCompressPendingComposerPdf={onCompressPendingComposerPdf}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kompres' }));

    expect(onCompressPendingComposerPdf).not.toHaveBeenCalled();
    expect(screen.getByTestId('open-id').textContent).toBe('attachment-3');
    expect(screen.getByTestId('menu-position').textContent).toBe('open');
    expect(screen.getByTestId('compression-menu-position').textContent).toBe(
      'open'
    );
    expect(screen.getByRole('button', { name: 'Extreme' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recommended' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Less' })).toBeTruthy();
  });

  it('compresses the pdf with the selected level from the submenu', () => {
    const onCompressPendingComposerPdf = vi.fn().mockResolvedValue(true);

    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment({
          id: 'attachment-5',
          file: new File(['pdf'], 'stok.pdf', {
            type: 'application/pdf',
          }),
          fileName: 'stok.pdf',
          fileTypeLabel: 'PDF',
          fileKind: 'document',
          mimeType: 'application/pdf',
          previewUrl: null,
        })}
        onCompressPendingComposerPdf={onCompressPendingComposerPdf}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kompres' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recommended' }));

    expect(onCompressPendingComposerPdf).toHaveBeenCalledWith(
      'attachment-5',
      'recommended'
    );
    expect(screen.getByTestId('open-id').textContent).toBe('');
    expect(screen.getByTestId('compression-menu-position').textContent).toBe(
      'closed'
    );
  });

  it('hides the compress action for non-pdf documents', () => {
    render(
      <ComposerAttachmentPreviewHarness
        attachment={buildAttachment({
          id: 'attachment-4',
          file: new File(['doc'], 'stok.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
          fileName: 'stok.docx',
          fileTypeLabel: 'DOCX',
          fileKind: 'document',
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          previewUrl: null,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));

    expect(screen.queryByRole('button', { name: 'Kompres' })).toBeNull();
  });
});
