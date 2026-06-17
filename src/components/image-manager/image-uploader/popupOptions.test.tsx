import { describe, expect, it, vi } from 'vite-plus/test';
import { getImageUploaderPopupOptions } from './popupOptions';

describe('getImageUploaderPopupOptions', () => {
  it('routes unavailable delete feedback through the caller callback', () => {
    const onUnavailableDelete = vi.fn();

    const options = getImageUploaderPopupOptions({
      closePortal: vi.fn(),
      handleDeleteImage: vi.fn(),
      handleUploadClick: vi.fn(),
      hasImage: true,
      isDeleting: false,
      isUploading: false,
      onUnavailableDelete,
    });

    options.find(option => option.label === 'Hapus')?.action();

    expect(onUnavailableDelete).toHaveBeenCalledOnce();
  });

  it('uses the delete handler when image deletion is available', () => {
    const handleDeleteImage = vi.fn();
    const onUnavailableDelete = vi.fn();

    const options = getImageUploaderPopupOptions({
      closePortal: vi.fn(),
      handleDeleteImage,
      handleUploadClick: vi.fn(),
      hasImage: true,
      isDeleting: false,
      isUploading: false,
      onImageDelete: vi.fn(),
      onUnavailableDelete,
    });

    options.find(option => option.label === 'Hapus')?.action();

    expect(handleDeleteImage).toHaveBeenCalledOnce();
    expect(onUnavailableDelete).not.toHaveBeenCalled();
  });
});
