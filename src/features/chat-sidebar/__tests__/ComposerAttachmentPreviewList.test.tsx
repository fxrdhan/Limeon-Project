import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import ComposerAttachmentPreviewList from '../components/composer/ComposerAttachmentPreviewList';
import type { PendingComposerAttachment } from '../types';

const buildAttachment = (
  overrides: Partial<PendingComposerAttachment> = {}
): PendingComposerAttachment => ({
  id: overrides.id ?? 'pending-image-1',
  file:
    overrides.file ??
    new File(['image'], 'bulk-image.png', { type: 'image/png' }),
  fileName: overrides.fileName ?? 'bulk-image.png',
  fileTypeLabel: overrides.fileTypeLabel ?? 'PNG',
  fileKind: overrides.fileKind ?? 'image',
  mimeType: overrides.mimeType ?? 'image/png',
  previewUrl: overrides.previewUrl ?? 'blob:bulk-image-preview',
  pdfCoverUrl: overrides.pdfCoverUrl ?? null,
  pdfPageCount: overrides.pdfPageCount ?? null,
});

describe('ComposerAttachmentPreviewList', () => {
  it('renders attachment previews inside a scrollable list container', () => {
    const { container } = render(
      <ComposerAttachmentPreviewList
        attachments={Array.from({ length: 12 }, (_, index) =>
          buildAttachment({
            id: `pending-image-${index + 1}`,
            fileName: `bulk-image-${index + 1}.png`,
            previewUrl: `blob:bulk-image-${index + 1}`,
          })
        )}
        openImageActionsAttachmentId={null}
        isSelectionMode={false}
        selectedAttachmentIds={[]}
        imageActionsButtonRef={createRef<HTMLButtonElement>()}
        transition={{
          duration: 0.2,
          ease: 'easeOut',
          layout: {
            type: 'tween',
            ease: [0.22, 1, 0.36, 1],
            duration: 0.2,
          },
        }}
        onToggleImageActionsMenu={vi.fn()}
        onToggleAttachmentSelection={vi.fn()}
        onCancelLoadingComposerAttachment={vi.fn()}
        onRemovePendingComposerAttachment={vi.fn()}
      />
    );

    expect(screen.getByText('bulk-image-1.png')).toBeTruthy();

    const scrollContainer = container.querySelector('div.overflow-y-auto');

    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer?.className).toContain('h-full');
  });
});
