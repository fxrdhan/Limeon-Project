import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

  it('reports when the attachment preview list reaches the bottom', () => {
    const onScrollStateChange = vi.fn();
    const { container } = render(
      <ComposerAttachmentPreviewList
        attachments={Array.from({ length: 3 }, (_, index) =>
          buildAttachment({
            id: `pending-image-${index + 1}`,
            fileName: `bulk-image-${index + 1}.png`,
            previewUrl: `blob:bulk-image-${index + 1}`,
          })
        )}
        openImageActionsAttachmentId={null}
        isSelectionMode={true}
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
        onScrollStateChange={onScrollStateChange}
      />
    );

    const scrollContainer = container.querySelector(
      'div.overflow-y-auto'
    ) as HTMLDivElement | null;

    expect(scrollContainer).toBeTruthy();

    Object.defineProperties(scrollContainer!, {
      clientHeight: {
        configurable: true,
        value: 120,
      },
      scrollHeight: {
        configurable: true,
        value: 240,
      },
      scrollTop: {
        configurable: true,
        writable: true,
        value: 0,
      },
    });

    fireEvent.scroll(scrollContainer!);
    scrollContainer!.scrollTop = 120;
    fireEvent.scroll(scrollContainer!);

    expect(onScrollStateChange).toHaveBeenLastCalledWith({
      hasOverflow: true,
      isAtTop: false,
      isAtBottom: true,
    });
  });

  it('closes the open attachment menu when its trigger scrolls out of the tray viewport', () => {
    const onCloseImageActionsMenu = vi.fn();
    const imageActionsButtonRef = createRef<HTMLButtonElement>();
    const { container } = render(
      <ComposerAttachmentPreviewList
        attachments={[
          buildAttachment({
            id: 'pending-image-1',
            fileName: 'bulk-image-1.png',
            previewUrl: 'blob:bulk-image-1',
          }),
        ]}
        openImageActionsAttachmentId="pending-image-1"
        isSelectionMode={false}
        selectedAttachmentIds={[]}
        imageActionsButtonRef={imageActionsButtonRef}
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
        onCloseImageActionsMenu={onCloseImageActionsMenu}
        onToggleAttachmentSelection={vi.fn()}
        onCancelLoadingComposerAttachment={vi.fn()}
        onRemovePendingComposerAttachment={vi.fn()}
      />
    );

    const scrollContainer = container.querySelector(
      'div.overflow-y-auto'
    ) as HTMLDivElement | null;

    expect(scrollContainer).toBeTruthy();
    expect(imageActionsButtonRef.current).toBeTruthy();

    scrollContainer!.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 240,
      height: 120,
      top: 0,
      right: 240,
      bottom: 120,
      left: 0,
      toJSON: () => ({}),
    }));
    imageActionsButtonRef.current!.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 140,
      width: 200,
      height: 44,
      top: 140,
      right: 200,
      bottom: 184,
      left: 0,
      toJSON: () => ({}),
    }));

    fireEvent.scroll(scrollContainer!);

    expect(onCloseImageActionsMenu).toHaveBeenCalledTimes(1);
  });

  it('auto-scrolls the selected attachment until it is clear of the tray fog', () => {
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => {
        callback(0);
        return 1;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const { container, rerender } = render(
      <ComposerAttachmentPreviewList
        attachments={[
          buildAttachment({
            id: 'pending-image-1',
            fileName: 'bulk-image-1.png',
            previewUrl: 'blob:bulk-image-1',
          }),
        ]}
        openImageActionsAttachmentId={null}
        isSelectionMode={true}
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

    const scrollContainer = container.querySelector(
      'div.overflow-y-auto'
    ) as HTMLDivElement | null;
    const attachmentRow = container.querySelector(
      '[data-chat-composer-attachment-id="pending-image-1"]'
    ) as HTMLDivElement | null;

    expect(scrollContainer).toBeTruthy();
    expect(attachmentRow).toBeTruthy();

    const scrollTo = vi.fn();
    Object.defineProperties(scrollContainer!, {
      clientHeight: {
        configurable: true,
        value: 160,
      },
      scrollHeight: {
        configurable: true,
        value: 360,
      },
      scrollTop: {
        configurable: true,
        writable: true,
        value: 40,
      },
      scrollTo: {
        configurable: true,
        value: scrollTo,
      },
    });
    Object.defineProperties(attachmentRow!, {
      offsetTop: {
        configurable: true,
        value: 150,
      },
      offsetHeight: {
        configurable: true,
        value: 54,
      },
    });

    act(() => {
      rerender(
        <ComposerAttachmentPreviewList
          attachments={[
            buildAttachment({
              id: 'pending-image-1',
              fileName: 'bulk-image-1.png',
              previewUrl: 'blob:bulk-image-1',
            }),
          ]}
          openImageActionsAttachmentId={null}
          isSelectionMode={true}
          selectedAttachmentIds={['pending-image-1']}
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
    });

    expect(scrollTo).toHaveBeenCalledWith({
      top: 100,
      behavior: 'smooth',
    });

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });
});
