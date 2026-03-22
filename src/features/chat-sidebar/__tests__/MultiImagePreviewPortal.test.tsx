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
  it('renders black header controls and wires share, forward, download, and close actions', () => {
    const onSelectPreview = vi.fn();
    const onDownloadActivePreview = vi.fn();
    const onOpenActivePreviewInNewTab = vi.fn();
    const onCopyActivePreviewLink = vi.fn();
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
            stageUrls: [],
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
      screen.getByRole('button', { name: 'Unduh gambar' }).className
    ).toContain('cursor-pointer');
    expect(
      screen.getByRole('button', { name: 'Tutup preview gambar' }).className
    ).toContain('cursor-pointer');

    fireEvent.click(screen.getByRole('button', { name: 'Buka di tab baru' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salin link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Teruskan gambar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unduh gambar' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Tutup preview gambar' })
    );

    expect(onOpenActivePreviewInNewTab).toHaveBeenCalledTimes(1);
    expect(onCopyActivePreviewLink).toHaveBeenCalledTimes(1);
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
            stageUrls: [],
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
