import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';
import MultiImagePreviewPortal from '../components/MultiImagePreviewPortal';

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
  default: () => <div data-testid="progressive-image-preview" />,
}));

describe('MultiImagePreviewPortal', () => {
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

  it('prefers lightweight thumbnail sources for the sidebar strip', () => {
    render(
      <MultiImagePreviewPortal
        isOpen={true}
        isVisible={true}
        previewItems={[
          {
            id: 'image-1',
            thumbnailUrl: 'data:image/png;base64,thumb-light',
            previewUrl: 'data:image/png;base64,preview-mid',
            fullPreviewUrl: 'https://example.com/full-heavy.png',
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

    expect(screen.getByAltText('Thumbnail photo.png').getAttribute('src')).toBe(
      'data:image/png;base64,thumb-light'
    );
  });
});
