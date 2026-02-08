import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IdentityModalProvider } from '@/contexts/IdentityModalContext';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IdentityImageUploader from './IdentityImageUploader';

const cacheImageBlobMock = vi.hoisted(() => vi.fn());
const getCachedImageMock = vi.hoisted(() => vi.fn());
const getCachedImageBlobUrlMock = vi.hoisted(() => vi.fn());
const setCachedImageMock = vi.hoisted(() => vi.fn());

const imageUploaderPropsStore = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/utils/imageCache', () => ({
  cacheImageBlob: (url: string) => cacheImageBlobMock(url),
  getCachedImage: (key: string) => getCachedImageMock(key),
  getCachedImageBlobUrl: (url: string) => getCachedImageBlobUrlMock(url),
  setCachedImage: (key: string, url: string) => setCachedImageMock(key, url),
}));

vi.mock('@/components/image-manager', () => ({
  default: (props: Record<string, unknown>) => {
    imageUploaderPropsStore.current = props;
    return (
      <div data-testid="identity-image-manager">
        <button
          type="button"
          onClick={async () => {
            const handler = props.onImageUpload as
              | ((file: File) => Promise<void>)
              | undefined;
            if (handler) {
              await handler(
                new File(['img'], 'identity.png', { type: 'image/png' })
              );
            }
          }}
        >
          run-upload
        </button>
        <button
          type="button"
          onClick={async () => {
            const handler = props.onImageDelete as
              | (() => Promise<void>)
              | undefined;
            if (handler) {
              await handler();
            }
          }}
        >
          run-delete
        </button>
        {props.children as ReactNode}
      </div>
    );
  },
}));

const buildContext = (overrides: Record<string, unknown> = {}) => ({
  editMode: {},
  editValues: {},
  currentImageUrl: null,
  isUploadingImage: false,
  loadingField: {},
  isSubmitting: false,
  localData: { id: 'id-1', name: 'Entity A' },
  title: 'Modal',
  mode: 'add' as const,
  formattedUpdateAt: '-',
  imageAspectRatio: 'default' as const,
  showImageUploader: true,
  imageUploadText: 'Unggah gambar',
  imageNotAvailableText: 'Tidak ada gambar',
  imageFormatHint: 'PNG/JPG',
  defaultImageUrl: undefined,
  imagePlaceholder: undefined,
  fields: [],
  toggleEdit: vi.fn(),
  handleChange: vi.fn(),
  handleSaveField: vi.fn().mockResolvedValue(undefined),
  handleCancelEdit: vi.fn(),
  handleSaveAll: vi.fn().mockResolvedValue(undefined),
  handleImageUpload: vi.fn().mockResolvedValue(undefined),
  handleImageDeleteInternal: vi.fn().mockResolvedValue(undefined),
  handleCloseModal: vi.fn(),
  deleteButtonLabel: 'Hapus',
  setInputRef: vi.fn(),
  ...overrides,
});

describe('IdentityImageUploader', () => {
  beforeEach(() => {
    imageUploaderPropsStore.current = null;
    cacheImageBlobMock.mockReset();
    getCachedImageMock.mockReset();
    getCachedImageBlobUrlMock.mockReset();
    setCachedImageMock.mockReset();
    getCachedImageMock.mockReturnValue(null);
    getCachedImageBlobUrlMock.mockResolvedValue(null);
    cacheImageBlobMock.mockResolvedValue(null);
  });

  it('renders add-mode placeholder, forwards upload/delete handlers, and keeps uploader enabled', async () => {
    const context = buildContext();

    render(
      <IdentityModalProvider value={context}>
        <IdentityImageUploader />
      </IdentityModalProvider>
    );

    expect(screen.getByText('Unggah gambar')).toBeInTheDocument();
    expect(imageUploaderPropsStore.current?.hasImage).toBe(false);
    expect(imageUploaderPropsStore.current?.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'run-upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'run-delete' }));

    await waitFor(() => {
      expect(context.handleImageUpload).toHaveBeenCalledTimes(1);
      expect(context.handleImageDeleteInternal).toHaveBeenCalledTimes(1);
    });
  });

  it('uses http source image with cache behavior and blob-url resolution', async () => {
    const context = buildContext({
      mode: 'edit',
      currentImageUrl: 'https://cdn.example.com/entity.jpg',
      imageAspectRatio: 'square',
    });
    getCachedImageBlobUrlMock.mockResolvedValue('blob://cached-image');

    render(
      <IdentityModalProvider value={context}>
        <IdentityImageUploader />
      </IdentityModalProvider>
    );

    await waitFor(() => {
      expect(setCachedImageMock).toHaveBeenCalledWith(
        'identity:id-1',
        'https://cdn.example.com/entity.jpg'
      );
      expect(getCachedImageBlobUrlMock).toHaveBeenCalledWith(
        'https://cdn.example.com/entity.jpg'
      );
    });

    const image = screen.getByAltText('Entity A') as HTMLImageElement;
    expect(image.src).toContain('blob://cached-image');
    expect(image.className).toContain('aspect-square');
    expect(imageUploaderPropsStore.current?.hasImage).toBe(true);
    expect(imageUploaderPropsStore.current?.disabled).toBe(true);
  });

  it('falls back to cacheImageBlob/source url and handles non-http source directly', async () => {
    cacheImageBlobMock.mockResolvedValueOnce(null);
    const contextHttpFallback = buildContext({
      mode: 'edit',
      currentImageUrl: 'https://cdn.example.com/http-fallback.jpg',
    });

    const firstRender = render(
      <IdentityModalProvider value={contextHttpFallback}>
        <IdentityImageUploader />
      </IdentityModalProvider>
    );

    await waitFor(() => {
      const image = screen.getByAltText('Entity A') as HTMLImageElement;
      expect(image.src).toContain('https://cdn.example.com/http-fallback.jpg');
      expect(cacheImageBlobMock).toHaveBeenCalledWith(
        'https://cdn.example.com/http-fallback.jpg'
      );
    });
    firstRender.unmount();

    const contextLocalSource = buildContext({
      mode: 'edit',
      currentImageUrl: 'data:image/png;base64,abc',
      localData: { id: 'id-1', name: 'Entity B' },
    });

    render(
      <IdentityModalProvider value={contextLocalSource}>
        <IdentityImageUploader />
      </IdentityModalProvider>
    );

    await waitFor(() => {
      const image = screen.getByAltText('Entity B') as HTMLImageElement;
      expect(image.src).toContain('data:image/png;base64,abc');
      expect(getCachedImageBlobUrlMock).toHaveBeenCalledTimes(1);
    });
  });

  it('renders default image, placeholder image, and empty-state text for edit mode', async () => {
    const defaultImageRender = render(
      <IdentityModalProvider
        value={buildContext({
          mode: 'edit',
          defaultImageUrl: 'https://cdn.example.com/default.png',
        })}
      >
        <IdentityImageUploader />
      </IdentityModalProvider>
    );
    await waitFor(() => {
      const image = screen.getByAltText('Entity A') as HTMLImageElement;
      expect(image.src).toContain('https://cdn.example.com/default.png');
    });
    defaultImageRender.unmount();

    const placeholderRender = render(
      <IdentityModalProvider
        value={buildContext({
          mode: 'edit',
          imagePlaceholder: 'https://cdn.example.com/placeholder.png',
        })}
      >
        <IdentityImageUploader />
      </IdentityModalProvider>
    );
    await waitFor(() => {
      const image = screen.getByAltText('Entity A') as HTMLImageElement;
      expect(image.src).toContain('https://cdn.example.com/placeholder.png');
    });
    placeholderRender.unmount();

    render(
      <IdentityModalProvider
        value={buildContext({
          mode: 'edit',
          imageNotAvailableText: 'Belum ada foto',
        })}
      >
        <IdentityImageUploader />
      </IdentityModalProvider>
    );

    expect(await screen.findByText('Belum ada foto')).toBeInTheDocument();
  });
});
