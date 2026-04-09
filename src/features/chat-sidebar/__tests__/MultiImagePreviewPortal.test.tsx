import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import MultiImagePreviewPortal from '../components/MultiImagePreviewPortal';

const { mockProgressiveImagePreview } = vi.hoisted(() => ({
  mockProgressiveImagePreview: vi.fn(),
}));

vi.mock('@/components/shared/image-expand-preview', () => ({
  default: ({
    children,
    isOpen,
  }: {
    children?: React.ReactNode;
    isOpen?: boolean;
  }) =>
    isOpen ? <div data-testid="image-expand-preview">{children}</div> : null,
}));

vi.mock('../components/ProgressiveImagePreview', () => ({
  default: (props: Record<string, unknown>) => {
    mockProgressiveImagePreview(props);
    return <div data-testid="progressive-image-preview" />;
  },
}));

const buildPreviewItems = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const nextIndex = index + 1;

    return {
      id: `image-${nextIndex}`,
      thumbnailUrl: `data:image/png;base64,thumb-${nextIndex}`,
      previewUrl: `data:image/png;base64,preview-${nextIndex}`,
      fullPreviewUrl: `https://example.com/full-${nextIndex}.png`,
      previewName: `photo-${nextIndex}.png`,
    };
  });

describe('MultiImagePreviewPortal', () => {
  it('uses the full preview as the backdrop and the sizing source', () => {
    render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={[
          {
            id: 'image-1',
            thumbnailUrl: 'data:image/png;base64,thumb',
            previewUrl: null,
            fullPreviewUrl: 'https://example.com/full.png',
            previewName: 'photo.png',
          },
        ]}
        activePreviewId="image-1"
        isActivePreviewForwardable={true}
        onSelectPreview={() => {}}
        onDownloadActivePreview={() => {}}
        onOpenActivePreviewInNewTab={() => {}}
        onCopyActivePreviewLink={() => {}}
        onCopyActivePreviewImage={() => {}}
        onReplyActivePreview={() => {}}
        onForwardActivePreview={() => {}}
        onClose={() => {}}
        backdropClassName="z-[80]"
      />
    );

    expect(mockProgressiveImagePreview).toHaveBeenCalledWith(
      expect.objectContaining({
        fullSrc: 'https://example.com/full.png',
        frameSourceSrc: 'https://example.com/full.png',
        backdropSrc: 'https://example.com/full.png',
      })
    );
  });

  it('keeps thumbnail columns tied to the sidebar width rather than item count', () => {
    const { container: singleContainer } = render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={buildPreviewItems(5)}
        activePreviewId="image-1"
        isActivePreviewForwardable={true}
        onSelectPreview={() => {}}
        onDownloadActivePreview={() => {}}
        onOpenActivePreviewInNewTab={() => {}}
        onCopyActivePreviewLink={() => {}}
        onCopyActivePreviewImage={() => {}}
        onReplyActivePreview={() => {}}
        onForwardActivePreview={() => {}}
        onClose={() => {}}
        backdropClassName="z-[80]"
      />
    );
    const { container: manyContainer } = render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={buildPreviewItems(8)}
        activePreviewId="image-1"
        isActivePreviewForwardable={true}
        onSelectPreview={() => {}}
        onDownloadActivePreview={() => {}}
        onOpenActivePreviewInNewTab={() => {}}
        onCopyActivePreviewLink={() => {}}
        onCopyActivePreviewImage={() => {}}
        onReplyActivePreview={() => {}}
        onForwardActivePreview={() => {}}
        onClose={() => {}}
        backdropClassName="z-[80]"
      />
    );

    const singleGrid = singleContainer.querySelector(
      'div[style*="grid-template-columns"]'
    ) as HTMLDivElement | null;
    const manyGrid = manyContainer.querySelector(
      'div[style*="grid-template-columns"]'
    ) as HTMLDivElement | null;

    expect(singleGrid?.style.gridTemplateColumns).toBe(
      manyGrid?.style.gridTemplateColumns
    );
    expect(singleGrid?.style.gridTemplateColumns).toBe('repeat(2, 99px)');
  });

  it('updates the thumbnail columns when the sidebar width changes', () => {
    const { container } = render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={buildPreviewItems(5)}
        activePreviewId="image-1"
        isActivePreviewForwardable={true}
        onSelectPreview={() => {}}
        onDownloadActivePreview={() => {}}
        onOpenActivePreviewInNewTab={() => {}}
        onCopyActivePreviewLink={() => {}}
        onCopyActivePreviewImage={() => {}}
        onReplyActivePreview={() => {}}
        onForwardActivePreview={() => {}}
        onClose={() => {}}
        backdropClassName="z-[80]"
      />
    );

    const grid = container.querySelector(
      'div[style*="grid-template-columns"]'
    ) as HTMLDivElement | null;
    const resizeHandle = screen.getByRole('separator', {
      name: 'Ubah lebar daftar gambar',
    });

    expect(grid?.style.gridTemplateColumns).toBe('repeat(2, 99px)');

    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });

    expect(grid?.style.gridTemplateColumns).toBe('repeat(3, 84px)');
  });

  it('wires open, copy, forward, download, and close actions', () => {
    const onSelectPreview = vi.fn();
    const onDownloadActivePreview = vi.fn();
    const onOpenActivePreviewInNewTab = vi.fn();
    const onCopyActivePreviewLink = vi.fn();
    const onCopyActivePreviewImage = vi.fn();
    const onReplyActivePreview = vi.fn();
    const onForwardActivePreview = vi.fn();
    const onClose = vi.fn();

    render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={[
          {
            id: 'image-1',
            thumbnailUrl: 'data:image/png;base64,thumb',
            previewUrl: 'data:image/png;base64,preview',
            fullPreviewUrl: 'https://example.com/full.png',
            previewName: 'photo.png',
          },
        ]}
        activePreviewId="image-1"
        isActivePreviewForwardable={true}
        onSelectPreview={onSelectPreview}
        onDownloadActivePreview={onDownloadActivePreview}
        onOpenActivePreviewInNewTab={onOpenActivePreviewInNewTab}
        onCopyActivePreviewLink={onCopyActivePreviewLink}
        onCopyActivePreviewImage={onCopyActivePreviewImage}
        onReplyActivePreview={onReplyActivePreview}
        onForwardActivePreview={onForwardActivePreview}
        onClose={onClose}
        backdropClassName="z-[80]"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buka di tab baru' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salin gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Balas gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teruskan gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unduh gambar' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Tutup preview gambar' })
    );

    expect(onOpenActivePreviewInNewTab).toHaveBeenCalledTimes(1);
    expect(onCopyActivePreviewLink).toHaveBeenCalledTimes(1);
    expect(onCopyActivePreviewImage).toHaveBeenCalledTimes(1);
    expect(onReplyActivePreview).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onForwardActivePreview).toHaveBeenCalledTimes(1);
    expect(onDownloadActivePreview).toHaveBeenCalledTimes(1);
    expect(onSelectPreview).not.toHaveBeenCalled();
  });

  it('disables the forward button when the active preview cannot be forwarded', () => {
    render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={[
          {
            id: 'temp-image-1',
            thumbnailUrl: 'data:image/png;base64,thumb',
            previewUrl: 'data:image/png;base64,preview',
            fullPreviewUrl: null,
            previewName: 'photo.png',
          },
        ]}
        activePreviewId="temp-image-1"
        isActivePreviewForwardable={false}
        onSelectPreview={() => {}}
        onDownloadActivePreview={() => {}}
        onOpenActivePreviewInNewTab={() => {}}
        onCopyActivePreviewLink={() => {}}
        onCopyActivePreviewImage={() => {}}
        onReplyActivePreview={() => {}}
        onForwardActivePreview={() => {}}
        onClose={() => {}}
        backdropClassName="z-[80]"
      />
    );

    expect(
      (
        screen.getByRole('button', {
          name: 'Teruskan gambar',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});
