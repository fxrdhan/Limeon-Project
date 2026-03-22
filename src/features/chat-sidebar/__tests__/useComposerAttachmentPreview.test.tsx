import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
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
}: {
  attachment: PendingComposerAttachment;
  onOpenImageActionsMenu?: () => void;
  onOpenComposerImagePreview?: (attachmentId: string) => void;
}) => {
  const preview = useComposerAttachmentPreview({
    pendingComposerAttachments: [attachment],
    onOpenImageActionsMenu,
    onAttachImageClick: vi.fn(),
    onAttachDocumentClick: vi.fn(),
    onCompressPendingComposerImage: vi.fn().mockResolvedValue(true),
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
      {preview.imageActions.map(action => (
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
});
