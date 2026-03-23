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

  it('renders black header controls and wires open, copy, forward, download, and close actions', () => {
    const onSelectPreview = vi.fn();
    const onDownloadActivePreview = vi.fn();
    const onOpenActivePreviewInNewTab = vi.fn();
    const onCopyActivePreviewLink = vi.fn();
    const onCopyActivePreviewImage = vi.fn();
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
        onForwardActivePreview={onForwardActivePreview}
        onClose={onClose}
        backdropClassName="z-[80]"
      />
    );

    const headerLabel = screen.getByTitle('1/1 | photo.png');
    expect(headerLabel.className).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Buka di tab baru' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Salin link' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Salin gambar' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Teruskan gambar' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Unduh gambar' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Tutup preview gambar' }).className
    ).toContain('text-black');
    expect(
      screen.getByRole('button', { name: 'Buka di tab baru' }).className
    ).toContain('cursor-pointer');
    expect(
      screen.getByRole('button', { name: 'Salin link' }).className
    ).toContain('cursor-pointer');
    expect(
      screen.getByRole('button', { name: 'Salin gambar' }).className
    ).toContain('cursor-pointer');
    expect(
      screen.getByRole('button', { name: 'Unduh gambar' }).className
    ).toContain('cursor-pointer');
    expect(
      screen.getByRole('button', { name: 'Tutup preview gambar' }).className
    ).toContain('cursor-pointer');

    fireEvent.click(screen.getByRole('button', { name: 'Buka di tab baru' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salin gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teruskan gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unduh gambar' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Tutup preview gambar' })
    );

    expect(onOpenActivePreviewInNewTab).toHaveBeenCalledTimes(1);
    expect(onCopyActivePreviewLink).toHaveBeenCalledTimes(1);
    expect(onCopyActivePreviewImage).toHaveBeenCalledTimes(1);
    expect(onForwardActivePreview).toHaveBeenCalledTimes(1);
    expect(onDownloadActivePreview).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
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
